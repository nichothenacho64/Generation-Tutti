from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pandas as pd

FOLDER_DIR = Path(__file__).resolve().parent.parent

KIPARLA_DATA_PATH = FOLDER_DIR / "kiparla-data"
PROMPTS_PATH = FOLDER_DIR / "prompts"
KIPASTI_DATA_PATH = KIPARLA_DATA_PATH / "kipasti-data"
METADATA_PATH = KIPARLA_DATA_PATH / "metadata"

def truthy_tuple[T](value: Iterator[T]) -> tuple[T, ...]:
    return tuple(filter(None, value))

def filter_series(series: pd.Series, func: Callable[[pd.Series], bool]) -> pd.Series:
    return series[series.map(lambda row: func(row))]

def filter_map_truthy(series: pd.Series, func: Callable[[pd.Series], Any]) -> pd.Series:
    return series[series.map(lambda row: bool(func(row)))].map(func)
