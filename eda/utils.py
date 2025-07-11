from pathlib import Path
from typing import Iterator

FOLDER_DIR = Path(__file__).resolve().parent.parent

KIPARLA_DATA_PATH = FOLDER_DIR / "kiparla-data" 
KIPASTI_DATA_PATH = KIPARLA_DATA_PATH / "kipasti-data"

def truthy_list[T](value: Iterator[T]) -> list[T]:
    return list(filter(None, value))