import concurrent.futures
import re
from collections.abc import Iterator
from pathlib import Path
from typing import ClassVar, cast

import pandas as pd

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

def _kp_vert_path(number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Path:
    if isinstance(number_or_code, str):
        return KIPASTI_DATA_PATH / f"{number_or_code}.vert.tsv"
    padded_number = str(number_or_code).zfill(3)
    path = KIPASTI_DATA_PATH / f"KP{region.short_name}{padded_number}.vert.tsv"
    assert path.exists(), f"Path {path} does not exist"
    return path

def _kp_path(number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Path:
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
        self._participants_by_code: dict[str, Participant] = self._parse_participants()

    def __getitem__(self, code_or_number: str | int) -> Participant:
        index = f"PKP{str(code_or_number).zfill(3)}" if isinstance(code_or_number, int) else code_or_number
        return self._participants_by_code[index]

    @property
    def df(self) -> pd.DataFrame:
        return self._df

    @classmethod
    def _parse_dataframe(cls) -> pd.DataFrame:
        participants_file_path = METADATA_PATH / cls.PARTICIPANTS_FILENAME
        assert participants_file_path.exists(), f"Path {participants_file_path} does not exist"
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
            }
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
            inplace=True
        )
        participants_df["age_range"] = participants_df["age_range"].map(AgeRange.parse)
        participants_df["generation"] = participants_df["age_range"].map(Generation.classify)
        return participants_df

    def _parse_participants(self) -> dict[str, Participant]:
        result = {}
        for row in self._df.itertuples():
            conversation_code = cast(str, row.in_files).split(", ")[0]
            result[row.code] = Participant(
                cast(str, row.code),
                cast(str, row.geographic_origin),
                cast(AgeRange, row.age_range),
                cast(Generation, row.generation),
                cast(str, row.mother_tonuge),
                conversation_code
            )
        return result

class ConversationParser:
    def __init__(self, participants: Participants):
        self._participants = participants

    def parse_conversation(self, number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Conversation:
        kpc_path = _kp_path(number_or_code, region)
        kpc_vert_path = _kp_vert_path(number_or_code, region)
        kpc_df = pd.read_csv(kpc_path, sep='\t')
        kpc_vert_df = pd.read_csv(kpc_vert_path, sep='\t')

        result = []
        normalised_words = []
        participants = set()
        kpc_rows = kpc_df.itertuples()
        current_tu_id = 0

        if isinstance(number_or_code, int):
            conversation_code = _kp_code(number_or_code)
        else:
            conversation_code = number_or_code

        for row in kpc_vert_df.itertuples():
            tu_id = row.tu_id
            word = row.form
            if current_tu_id != tu_id:
                kpc_row = next(kpc_rows)
                if row.speaker not in _NON_SPEAKERS:
                    participant = self._participants[cast(str, row.speaker)]
                    participants.add(participant)
                    conversation_line = ConversationLine(
                        conversation_code,
                        cast(int, row.tu_id),
                        participant,
                        cast(str, kpc_row.text),
                        normalised_words[:]
                    )
                    result.append(conversation_line)
                normalised_words.clear()
                current_tu_id = tu_id

            if isinstance(word, str):
                normalised_words.append(word)

        return Conversation(
            conversation_code,
            list(participants),
            pd.Series(result)
        )

class Conversations:
    def __init__(self, participants: Participants):
        self._parser = ConversationParser(participants)
        self._conversations: dict[str, Conversation] = {}

    def __iter__(self) -> Iterator[Conversation]:
        return iter(self._conversations.values())

    def conversation(self, number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Conversation:
        if isinstance(number_or_code, str):
            code = number_or_code
        else:
            code = _kp_code(number_or_code, region)

        if (conversation := self._conversations.get(code)) is not None:
            return conversation

        self._conversations[code] = conversation = self._parser.parse_conversation(code)
        return conversation

    def read_all(
        self,
        parallel: bool = False,
        progress_bar: bool = False,
        load_sentiments: bool = False,
        load_tagged: bool = False
    ):
        assert not (load_tagged and load_sentiments)
        tasks = []
        for path in KIPASTI_DATA_PATH.iterdir():
            if (match := _CONVERSATION_FILE_PATTERN.fullmatch(path.name)) is None:
                continue

            code = match.group(1)
            if code in self._conversations:
                continue

            self._conversations[code] = conversation = self._parser.parse_conversation(code)

            if not load_sentiments and not load_tagged:
                continue

            if not parallel:
                if load_sentiments:
                    conversation.load_sentiment_scores(progress_bar=progress_bar)
                else:
                    conversation.load_tagged()
            else:
                if load_sentiments:
                    tasks.append((conversation.load_sentiment_scores, dict(progress_bar=progress_bar)))
                else:
                    tasks.append((conversation.load_tagged, {}))

        if not parallel:
            return

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(func, **kwargs)
                for func, kwargs in tasks
            ]
            for future in concurrent.futures.as_completed(futures):
                future.result()

    def participant_lines(self, participant: Participant) -> ParticipantLines:
        conversation = self.conversation(participant.conversation_code)
        return conversation.participant_lines(participant)
