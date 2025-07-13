from pathlib import Path
from typing import Any, Callable, Iterator

import pandas as pd

FOLDER_DIR = Path(__file__).resolve().parent.parent

KIPARLA_DATA_PATH = FOLDER_DIR / "kiparla-data"
KIPASTI_DATA_PATH = KIPARLA_DATA_PATH / "kipasti-data"
METADATA_PATH = KIPARLA_DATA_PATH / "metadata"

def truthy_tuple[T](value: Iterator[T]) -> tuple[T, ...]:
    return tuple(filter(None, value))

def filter_map_truthy(series: pd.Series, func: Callable[[pd.Series], Any]) -> pd.Series:
    return series[series.apply(lambda row: bool(func(row)))].map(func)
