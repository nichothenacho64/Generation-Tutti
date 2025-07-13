from pathlib import Path
import re
from typing import ClassVar, cast

import pandas as pd

from eda.models import AgeRange, Conversation, ConversationLine, MacroRegion, Participant, ParticipantLines
from eda.utils import KIPASTI_DATA_PATH, METADATA_PATH

_DEFAULT_KP_REGION = MacroRegion.CENTRE
_PARTICIPANT_UNKNOWN = "???"

def _kp_code(number: int, region: MacroRegion) -> str:
    return "KP{}{}".format(region.short_name, str(number).zfill(3))

def _kp_vert_path(number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Path:
    if isinstance(number_or_code, str):
        return KIPASTI_DATA_PATH / f"{number_or_code}.vert.tsv"
    padded_number = str(number_or_code).zfill(3)
    path = KIPASTI_DATA_PATH / "KP{}{}.vert.tsv".format(region.short_name, padded_number)
    assert path.exists(), f"Path {path} does not exist"
    return path

def _kp_path(number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Path:
    if isinstance(number_or_code, str):
        return KIPASTI_DATA_PATH / f"{number_or_code}.csv"
    padded_number = str(number_or_code).zfill(3)
    path = KIPASTI_DATA_PATH / "KP{}{}.csv".format(region.short_name, padded_number)
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

    def _parse_participants(self) -> dict[str, Participant]:
        result = {}
        for row in self._df.itertuples():
            result[row.code] = Participant(
                cast(str, row.code),
                cast(str, row.geographic_origin),
                cast(AgeRange, row.age_range),
                cast(str, row.mother_tonuge),
                cast(str, row.in_files)
            )
        return result

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
        return participants_df

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
        kpc_rows = kpc_df.itertuples()
        current_tu_id = 0

        for row in kpc_vert_df.itertuples():
            tu_id = row.tu_id
            word = row.form
            if current_tu_id != tu_id:
                kpc_row = next(kpc_rows)
                if row.speaker != _PARTICIPANT_UNKNOWN:
                    conversation_line = ConversationLine(
                        self._participants[cast(str, row.speaker)],
                        cast(str, kpc_row.text),
                        normalised_words[:]
                    )
                    result.append(conversation_line)
                normalised_words.clear()
                current_tu_id = tu_id
            normalised_words.append(word)
        return Conversation(pd.Series(result))

class Conversations:
    def __init__(self, participants: Participants):
        self._parser = ConversationParser(participants)
        self._conversations: dict[str, Conversation] = {}

    def conversation(self, number_or_code: str | int, region: MacroRegion = _DEFAULT_KP_REGION) -> Conversation:
        if isinstance(number_or_code, str):
            code = number_or_code
        else:
            code = _kp_code(number_or_code, region)

        if (conversation := self._conversations.get(code)) is not None:
            return conversation

        self._conversations[code] = conversation = self._parser.parse_conversation(code)
        return conversation

    def participant_lines(self, participant: Participant) -> ParticipantLines:
        conversation = self.conversation(participant.conversation_code)
        lines_filter = conversation.lines.map(lambda line: line.participant == participant)
        return ParticipantLines(participant, conversation.lines[lines_filter])

