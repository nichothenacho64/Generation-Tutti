from pathlib import Path
from typing import ClassVar, Optional, cast

import pandas as pd

from eda.models import AgeRange, ConversationLine, Participant
from eda.utils import KIPARLA_DATA_PATH, KIPASTI_DATA_PATH

def _kpc_vert_path(number: int) -> Path:
    padded_number = str(number).zfill(3)
    path = KIPASTI_DATA_PATH / "KPC{}.vert.tsv".format(padded_number)
    assert path.exists(), f"Path {path} does not exist"
    return path

def _kpc_path(number: int) -> Path:
    padded_number = str(number).zfill(3)
    path = KIPASTI_DATA_PATH / "KPC{}.csv".format(padded_number)
    assert path.exists(), f"Path {path} does not exist"
    return path

class Participants:
    PARTICIPANTS_FILENAME: ClassVar[str] = "KIPasti_participants.xlsx"

    def __init__(self):
        self._df = self._parse_dataframe()
        self._participants_by_code = self._parse_participants()

    def __getitem__(self, participant_code: str) -> Participant:
        return self._participants_by_code[participant_code]

    def _parse_participants(self) -> dict[str, Participant]:
        result = {}
        for row in self._df.itertuples():
            result[row.code] = Participant(
                cast(str, row.code),
                cast(str, row.geographic_origin),
                cast(AgeRange, row.age_range),
                cast(str, row.mother_tonuge)
            )
        return result

    @classmethod
    def _parse_dataframe(cls) -> pd.DataFrame:
        participants_file_path = KIPARLA_DATA_PATH / "metadata" / cls.PARTICIPANTS_FILENAME
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
    def __init__(
        self,
        participants: Participants,
        *,
        conversation_number: Optional[int] = None,
        kpc_df: Optional[pd.DataFrame] = None,
        kpc_vert_df: Optional[pd.DataFrame] = None
    ):
        if kpc_df is None and kpc_vert_df is None:
            assert conversation_number is not None
            kpc_df, kpc_vert_df = self.parse_dataframes(conversation_number)
        assert kpc_df is not None and kpc_vert_df is not None
        self._participants = participants
        self._kpc_df = kpc_df
        self._kpc_vert_df = kpc_vert_df

    @classmethod
    def parse_dataframes(cls, conversation_number: int) -> tuple[pd.DataFrame, pd.DataFrame]:
        kpc_path = _kpc_path(conversation_number)
        kpc_vert_path = _kpc_vert_path(conversation_number)
        kpc_df = pd.read_csv(kpc_path, sep='\t')
        kpc_vert_df = pd.read_csv(kpc_vert_path, sep='\t')
        return (kpc_df, kpc_vert_df)

    def parse_conversation(self) -> list[ConversationLine]:
        result = []
        normalised_words = []
        kpc_rows = self._kpc_df.itertuples()
        current_tu_id = 0

        for row in self._kpc_vert_df.itertuples():
            tu_id = row.tu_id
            word = row.form
            if current_tu_id != tu_id:
                kpc_row = next(kpc_rows)
                conversation_line = ConversationLine(
                    self._participants[cast(str, row.speaker)],
                    cast(str, kpc_row.text),
                    normalised_words[:]
                )
                result.append(conversation_line)
                normalised_words.clear()
                current_tu_id = tu_id
            normalised_words.append(word)
        return result
