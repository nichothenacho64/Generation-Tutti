import random
from collections.abc import Callable, Iterator
from functools import partial
from pathlib import Path
from typing import Any

import pandas as pd

FOLDER_DIR = Path(__file__).resolve().parent.parent

KIPARLA_DATA_PATH = FOLDER_DIR / "kiparla-data"
PROMPTS_PATH = FOLDER_DIR / "prompts"
KIPASTI_DATA_PATH = KIPARLA_DATA_PATH / "kipasti-data"
METADATA_PATH = KIPARLA_DATA_PATH / "metadata"


def round_precise(value: float, n_digits: int = 2) -> int | float:
    exact_value = int(value)
    if value == exact_value:
        return exact_value
    else:
        return round(value, n_digits)


def random_hex_colour(min_luma: float = 0.7) -> str:
    rand8bit = partial(random.randint, 0, 255)
    while True:
        r = rand8bit()
        g = rand8bit()
        b = rand8bit()
        rf = r / 255
        gf = g / 255
        bf = b / 255

        luma = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf
        if luma >= min_luma:
            return f"#{r:02X}{g:02X}{b:02X}"


def truthy_tuple[T](value: Iterator[T]) -> tuple[T, ...]:
    return tuple(filter(None, value))


def filter_series(series: pd.Series, func: Callable[[pd.Series], bool]) -> pd.Series:
    return series[series.map(lambda row: func(row))]


def filter_map_truthy(series: pd.Series, func: Callable[[pd.Series], Any]) -> pd.Series:
    return series[series.map(lambda row: bool(func(row)))].map(func)


def gen_default_colours[T](
    iterator: Iterator[T], start: int = 0
) -> Iterator[tuple[str, T]]:
    yield from ((f"C{i}", value) for i, value in enumerate(iterator, start=start))


def default_colours(n_colours: int, start: int = 0) -> list[str]:
    return [f"C{i}" for i in range(start, start + n_colours)]
