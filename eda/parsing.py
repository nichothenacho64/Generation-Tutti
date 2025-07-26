import concurrent.futures
import re
from collections.abc import Iterator
from functools import cache
from pathlib import Path
from typing import ClassVar, Optional, cast

import pandas as pd

from eda.language import AttributedWord
from eda.models import (
    AgeRange,
    Conversation,
    ConversationLine,
    Generation,
    MacroRegion,
    Participant,
    ParticipantLines,
)
from eda.utils import KIPASTI_DATA_PATH, METADATA_PATH

_DEFAULT_KP_REGION = MacroRegion.CENTRE
_NON_SPEAKERS = frozenset(("???", "suoni"))
_CONVERSATION_FILE_PATTERN = re.compile(r"(KP[NCS]\d+).csv")


def _kp_code(number: int, region: MacroRegion) -> str:
    return f"KP{region.short_name}{str(number).zfill(3)}"


def _kp_vert_path(
    number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION
) -> Path:
    if isinstance(number_or_code, str):
        return KIPASTI_DATA_PATH / f"{number_or_code}.vert.tsv"
    padded_number = str(number_or_code).zfill(3)
    path = KIPASTI_DATA_PATH / f"KP{region.short_name}{padded_number}.vert.tsv"
    assert path.exists(), f"Path {path} does not exist"
    return path


def _kp_path(
    number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION
) -> Path:
    if isinstance(number_or_code, str):
        return KIPASTI_DATA_PATH / f"{number_or_code}.csv"
    padded_number = str(number_or_code).zfill(3)
    path = KIPASTI_DATA_PATH / f"KP{region.short_name}{padded_number}.csv"
    assert path.exists(), f"Path {path} does not exist"
    return path


class Participants:
    PARTICIPANTS_FILENAME: ClassVar[str] = "KIPasti_participants.xlsx"

    def __init__(self):
        self._df = self._parse_dataframe()
        self._conversations_df = pd.read_excel(
            METADATA_PATH / "KIPasti_conversations.xlsx"
        )
        region_to_macro_region = self._conversations_df[["region", "macro_region"]]
        region_to_macro_region = region_to_macro_region.drop_duplicates()
        region_to_macro_region = region_to_macro_region.set_index("region")["macro_region"]

        self._region_to_macro_region = {
            cast(str, key).strip(): MacroRegion.from_italian(cast(str, value).strip())
            for key, value in region_to_macro_region.to_dict().items()
        }
        self._add_regions_manual()

        self._participants_by_code: dict[str, Participant] = self._parse_participants()

    def __getitem__(self, code_or_number: str | int) -> Participant:
        index = (
            f"PKP{str(code_or_number).zfill(3)}"
            if isinstance(code_or_number, int)
            else code_or_number
        )
        return self._participants_by_code[index]

    def __iter__(self) -> Iterator[Participant]:
        return iter(self._participants_by_code.values())

    @property
    def df(self) -> pd.DataFrame:
        return self._df

    @property
    def conversations_df(self) -> pd.DataFrame:
        return self._conversations_df

    @classmethod
    def _parse_dataframe(cls) -> pd.DataFrame:
        participants_file_path = METADATA_PATH / cls.PARTICIPANTS_FILENAME
        assert participants_file_path.exists(), (
            f"Path {participants_file_path} does not exist"
        )
        participants_df = pd.read_excel(
            participants_file_path,
            keep_default_na=False,
            dtype={
                "participant code": str,
                "participant occupation": str,
                "participant sex": str,
                "files in which participant appears": str,
                "participant geographic origin": str,
                "participant age range": str,
                "participant degree": str,
                "mothertounge": str,
            },
        )

        participants_df.rename(
            columns={
                "participant code": "code",
                "participant occupation": "occupation",
                "participant sex": "participant_sex",
                "files in which participant appears": "in_files",
                "participant geographic origin": "geographic_origin",
                "participant age range": "age_range",
                "participant degree": "degree",
                "mothertongue": "mother_tonuge",
            },
            inplace=True,
        )
        participants_df["age_range"] = participants_df["age_range"].map(AgeRange.parse)
        participants_df["generation"] = participants_df["age_range"].map(
            Generation.classify
        )
        return participants_df

    def geographic_origins(self) -> list[str]:
        return self._df["geographic_origin"].unique().tolist()

    def _parse_participants(self) -> dict[str, Participant]:
        result = {}
        for row in self._df.itertuples():
            # Data reconcilliation
            geographic_origin = region = cast(str, row.geographic_origin).strip()
            macro_region = self._region_to_macro_region[region]
            conversation_code = cast(str, row.in_files).split(", ")[0]
            result[row.code] = Participant(
                cast(str, row.code),
                geographic_origin,
                macro_region,
                cast(AgeRange, row.age_range),
                cast(Generation, row.generation),
                cast(str, row.degree),
                cast(str, row.mother_tonuge),
                conversation_code,
            )
        return result

    def _add_regions_manual(self):
        self._region_to_macro_region["piemonte"] = MacroRegion.NORTH
        self._region_to_macro_region["estero"] = MacroRegion.EXTERNAL
        self._region_to_macro_region["sicilia"] = MacroRegion.SOUTH
        self._region_to_macro_region["friuli-venezia-giulia"] = MacroRegion.NORTH


class ConversationParser:
    def __init__(self, participants: Participants):
        self._participants = participants
        self._conversations_df = participants.conversations_df

    def parse_conversation(
        self,
        number_or_code: str | int,
        default_macro_region: Optional[MacroRegion] = None,
    ) -> Conversation:
        if isinstance(number_or_code, int):
            conversation_code = _kp_code(
                number_or_code, default_macro_region or _DEFAULT_KP_REGION
            )
        else:
            conversation_code = number_or_code

        metadata = self._conversation_metadata(conversation_code)
        languages = cast(str, metadata["languages"]).split("-")
        macro_region = MacroRegion.from_italian(metadata["macro_region"])
        region = metadata["region"].strip()

        kp_path = _kp_path(number_or_code, macro_region)
        kp_vert_path = _kp_vert_path(number_or_code, macro_region)
        kp_df = pd.read_csv(kp_path, sep="\t")
        kp_vert_df = pd.read_csv(kp_vert_path, sep="\t")

        result = []
        normalised_words = []
        participants = set()
        kp_rows = kp_df.itertuples()
        current_tu_id = 0

        for row in kp_vert_df.itertuples():
            speaker = cast(str, row.speaker)
            if speaker == "_":
                # Variation on existing line;
                # we can safely ignore this
                continue

            tu_id = row.tu_id
            word = row.form

            if current_tu_id != tu_id:
                kp_row = next(kp_rows)
                if row.speaker not in _NON_SPEAKERS:
                    participant = self._participants[speaker]
                    participants.add(participant)
                    conversation_line = ConversationLine(
                        conversation_code,
                        cast(int, row.tu_id),
                        participant,
                        cast(str, kp_row.text),
                        normalised_words[:],
                    )
                    result.append(conversation_line)

                normalised_words.clear()
                current_tu_id = tu_id

            if isinstance(word, str):
                normalised_words.append(
                    AttributedWord(
                        word,
                        word_type=cast(str, row.type),
                        jefferson_features=cast(str, row.jefferson_feats).split('|'),
                        variation=cast(str, row.variation),
                    )
                )

        return Conversation(
            conversation_code,
            list(participants),
            frozenset(languages),
            macro_region,
            region,
            pd.Series(result),
        )

    def _conversation_metadata(self, code: str) -> pd.Series:
        matching_code = self._conversations_df[self._conversations_df["code"] == code]
        try:
            return matching_code.iloc[0]
        except IndexError:
            raise ValueError(f"Unknown conversation code {code!r}") from None


class Conversations:
    def __init__(self, participants: Participants):
        self._parser = ConversationParser(participants)
        self._conversations: dict[str, Conversation] = {}

    def __len__(self) -> int:
        return len(self._conversations)

    def __iter__(self) -> Iterator[Conversation]:
        return iter(self._conversations.values())

    def conversation(
        self, number_or_code: str | int, macro_region: Optional[MacroRegion] = None
    ) -> Conversation:
        if isinstance(number_or_code, str):
            code = number_or_code
        else:
            code = _kp_code(number_or_code, macro_region or _DEFAULT_KP_REGION)

        if (conversation := self._conversations.get(code)) is not None:
            return conversation

        self._conversations[code] = conversation = self._parser.parse_conversation(
            code, macro_region
        )
        return conversation

    def read_all(
        self,
        parallel: bool = False,
        progress_bar: bool = False,
        load_sentiments: bool = False,
        load_tagged: bool = False,
        load_prosodic: bool = False,
        parallel_batches: Optional[bool] = None,
    ):
        assert load_sentiments + load_tagged + load_prosodic <= 1
        parallel_batches = (
            parallel_batches if parallel_batches is not None else parallel
        )

        tasks = []
        for path in KIPASTI_DATA_PATH.iterdir():
            if (match := _CONVERSATION_FILE_PATTERN.fullmatch(path.name)) is None:
                continue

            code = match.group(1)
            if (conversation := self._conversations.get(code)) is None:
                self._conversations[code] = conversation = (
                    self._parser.parse_conversation(code)
                )

            if not load_sentiments and not load_tagged and not load_prosodic:
                continue

            if not parallel:
                if load_sentiments:
                    conversation.load_sentiment_scores(progress_bar=progress_bar)
                elif load_prosodic:
                    conversation.load_prosodic()
                else:
                    conversation.load_tagged()
            else:
                if load_sentiments:
                    tasks.append((
                        conversation.load_sentiment_scores,
                        dict(progress_bar=progress_bar, parallel=parallel_batches),
                    ))
                elif load_prosodic:
                    tasks.append((
                        conversation.load_prosodic,
                        dict(parallel=parallel_batches),
                    ))
                else:
                    tasks.append((
                        conversation.load_tagged,
                        dict(parallel=parallel_batches, progress_bar=progress_bar),
                    ))

        if not parallel:
            return

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(func, **kwargs) for func, kwargs in tasks]
            for future in concurrent.futures.as_completed(futures):
                future.result()

    def participant_lines(self, participant: Participant) -> ParticipantLines:
        conversation = self.conversation(participant.conversation_code)
        return conversation.participant_lines(participant)

    @cache
    def participant_dialect_words(
        self, participant: Participant, strict: bool = True
    ) -> list[AttributedWord]:
        conversation = self.conversation(participant.conversation_code)
        dialect_words = []
        for line in conversation:
            dialect_words.extend(
                word for word in line.normalised_words if word.is_dialect(strict=strict)
            )
        return dialect_words
