import concurrent.futures
import enum
import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from functools import cached_property
from typing import ClassVar, Optional, Protocol, Self, cast, overload, runtime_checkable

import pandas as pd
from tqdm import tqdm

from eda.language import AttributedWord, TaggedText, tag
from eda.sentiments import TextSentiments
from eda.utils import filter_series, random_hex_colour, truthy_tuple

# Based on the oldest (recorded) person to ever live, Jeanne Calment
# https://en.wikipedia.org/wiki/Jeanne_Calment
# In any case this doesn't matter since comparisons are all based on
# less than, or greater than.
_OLDEST_POSSIBLE_AGE = 122
_OVER_AGE = -1
_OVER_EIGHTY_FIVE = "over 85"


def _simplify_text(text: str, lowercased: bool = True) -> str:
    # Even the normalised text may still contain things we don't want
    # We can remove that in this function
    if lowercased:
        text = text.lower()
    without_pauses = re.sub(r"\(\.\) ", "", text)
    without_unknowns = re.sub(r"[xX]{2,} |(?<= )[xX] ", "", without_pauses)
    without_bracketed = re.sub(r"\{.+?\}", "", without_unknowns)
    without_ps = re.sub(r"\{[pP]\} ", "", without_bracketed)
    simplifed = re.sub(r"[\[\]<>°.?:()]|\.(?<=[A-Za-z])", "", without_ps)
    return simplifed


class MacroRegion(enum.Enum):
    NORTH = enum.auto()
    CENTRE = enum.auto()
    SOUTH = enum.auto()
    EXTERNAL = enum.auto()

    def __lt__(self, other: object) -> bool:
        if isinstance(other, MacroRegion):
            return self.value >= other.value
        raise NotImplementedError

    @classmethod
    def from_italian(cls, name: str) -> "MacroRegion":
        match name:
            case "CENTRO":
                return cls.CENTRE
            case "NORD":
                return cls.NORTH
            case "SUD":
                return cls.SOUTH
            case _:
                raise ValueError(f"Unknown macro region for {name}")

    @property
    def short_name(self) -> str:
        return self.name[0]


@dataclass(eq=True, frozen=True)
class AgeRange:
    youngest_age: int
    oldest_age: int

    def __repr__(self) -> str:
        if self.oldest_age == _OLDEST_POSSIBLE_AGE:
            return f"{self.__class__.__name__}({_OVER_EIGHTY_FIVE})"
        elif self.oldest_age == _OVER_AGE:
            return f"{self.__class__.__name__}(over {self.youngest_age})"
        else:
            return f"{self.__class__.__name__}({self.youngest_age}-{self.oldest_age})"

    def __str__(self) -> str:
        if self.oldest_age == _OLDEST_POSSIBLE_AGE:
            return _OVER_EIGHTY_FIVE
        elif self.oldest_age == _OVER_AGE:
            return f"over {self.youngest_age}"
        else:
            return f"{self.youngest_age}—{self.oldest_age}"

    def __lt__(self, other: Self) -> bool:
        return self.youngest_age < other.youngest_age

    @classmethod
    def parse(cls, value: str) -> "AgeRange":
        if value == _OVER_EIGHTY_FIVE:
            return cls(youngest_age=85, oldest_age=_OLDEST_POSSIBLE_AGE)
        else:
            return cls(*map(int, value.split("-")))

    def includes(self, other: Self) -> bool:
        if self.oldest_age == _OVER_AGE:
            return other.youngest_age > self.youngest_age
        else:
            return other.youngest_age < self.oldest_age


@dataclass(eq=True, frozen=True)
class Generation:
    _registry: ClassVar[list[tuple[AgeRange, Self]]] = []
    _include_range_in_str: ClassVar[bool] = True

    X: ClassVar[Self]
    Y: ClassVar[Self]
    Z: ClassVar[Self]
    BOOMERS: ClassVar[Self]

    name: str
    age_range: AgeRange

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.name}, {self.age_range})"

    def __str__(self) -> str:
        if not self.__class__._include_range_in_str:
            return self.name
        else:
            return f"{self.name} ({self.age_range})"

    def __lt__(self, other: Self) -> bool:
        return self.age_range < other.age_range

    @classmethod
    def register(cls, *values: Self):
        for value in values:
            cls._registry.append((value.age_range, value))

    @classmethod
    def classify(cls, age_range: AgeRange) -> Self:
        for other_age_range, generation in cls._registry:
            if other_age_range.includes(age_range):
                return generation
        else:
            raise Exception(f"Unknown generation for age range {age_range}")

    @classmethod
    def create_mapping(cls) -> dict[Self, list]:
        return {cls.BOOMERS: [], cls.X: [], cls.Y: [], cls.Z: []}


Generation.Z = gen_z = Generation("Generation Z", AgeRange(16, 25))
Generation.Y = gen_y = Generation("Generation Y", AgeRange(26, 50))
Generation.X = gen_x = Generation("Generation X", AgeRange(51, 65))
Generation.BOOMERS = boomer = Generation("Baby Boomers", AgeRange(66, _OVER_AGE))
Generation.register(gen_z, gen_y, gen_x, boomer)


@dataclass(frozen=True)
class Participant:
    code: str
    geographic_origin: str
    macro_region: MacroRegion
    age_range: AgeRange
    generation: Generation
    mother_tongue: str
    conversation_code: str

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Participant):
            return self.code == other.code
        raise NotImplementedError

    def is_native_dialect_speaker(self) -> bool:
        return self.mother_tongue == "dialetto"


_OVERLAPPING_PATTERN = re.compile(r"\[(.+?)\]")
_SPED_UP_PATTERN = re.compile(r">(.+?)<")
_SLOW_DOWN_PATTERN = re.compile(r"<(.+?)>")
_LOW_VOLUME_PATTERN = re.compile(r"°(.+?)°")
_RAISED_VOLUME_PATTERN = re.compile(r"([A-Z]+)")


@dataclass
class ConversationLine:
    conversation_code: str
    tu_id: int
    participant: Participant
    text: str
    normalised_words: list[AttributedWord]
    normalised_text: str = field(init=False)
    sentiments: TextSentiments = field(init=False)

    def __post_init__(self):
        self.normalised_text = " ".join(self.normalised_words)
        self.sentiments = TextSentiments(
            _simplify_text(self.normalised_text), self.conversation_code
        )

    @cached_property
    def tagged(self) -> list[TaggedText]:
        return tag(_simplify_text(self.normalised_text, lowercased=False))

    @staticmethod
    def _property_factory(pattern: re.Pattern[str]) -> cached_property[tuple[str, ...]]:
        def fget(self: "ConversationLine") -> tuple[str, ...]:
            return truthy_tuple(
                _simplify_text(match.group(1)) for match in pattern.finditer(self.text)
            )

        return cached_property(fget)

    overlapping_phrases = _property_factory(_OVERLAPPING_PATTERN)
    sped_up_phrases = _property_factory(_SPED_UP_PATTERN)
    slowed_down_phrases = _property_factory(_SLOW_DOWN_PATTERN)
    low_volume_phrases = _property_factory(_LOW_VOLUME_PATTERN)
    raised_volume_phrases = _property_factory(_RAISED_VOLUME_PATTERN)

    def load_prosodic(self):
        _ = self.overlapping_phrases
        _ = self.sped_up_phrases
        _ = self.slowed_down_phrases
        _ = self.low_volume_phrases
        _ = self.raised_volume_phrases


@runtime_checkable
class SupportsLineOperations(Protocol):
    @overload
    def __getitem__(self, index: int) -> ConversationLine: ...

    @overload
    def __getitem__(self, index: slice) -> pd.Series: ...

    def __getitem__(self, index: int | slice) -> ConversationLine | pd.Series: ...

    def __iter__(self) -> Iterator[ConversationLine]: ...

    @property
    def last_tu_id(self) -> int: ...


@dataclass
class ParticipantLines(SupportsLineOperations):
    participant: Participant
    lines: pd.Series

    @overload
    def __getitem__(self, index: int) -> ConversationLine: ...

    @overload
    def __getitem__(self, index: slice) -> pd.Series: ...

    def __getitem__(self, index: int | slice) -> ConversationLine | pd.Series:
        return self.lines[index]

    def __len__(self) -> int:
        return len(self.lines)

    def __iter__(self) -> Iterator[ConversationLine]:
        return iter(self.lines)

    @property
    def last_tu_id(self) -> int:
        line = cast(ConversationLine, self.lines.tail(1).item())
        return line.tu_id


@dataclass
class Conversation(SupportsLineOperations):
    code: str
    participants: list[Participant]
    languages: frozenset[str]
    macro_region: MacroRegion
    region: str
    lines: pd.Series

    def __post_init__(self):
        self.participants.sort(key=lambda participant: participant.code)

    def __len__(self) -> int:
        return len(self.lines)

    @overload
    def __getitem__(self, index: int) -> ConversationLine: ...

    @overload
    def __getitem__(self, index: slice) -> pd.Series: ...

    def __getitem__(self, index: int | slice) -> ConversationLine | pd.Series:
        return self.lines[index]

    def __iter__(self) -> Iterator[ConversationLine]:
        return iter(self.lines)

    @property
    def last_tu_id(self) -> int:
        line = cast(ConversationLine, self.lines.tail(1).item())
        return line.tu_id

    def has_dialect_spoken(self) -> bool:
        return "dialetto" in self.languages

    def load_sentiment_scores(self, parallel: bool = False, progress_bar: bool = False):
        if all(line.sentiments.has_loaded_scores() for line in self):
            return

        if progress_bar:
            pbar = tqdm(
                total=len(self),
                desc=f"{self.code} sentiment scores",
                unit="lines",
                dynamic_ncols=True,
                colour=random_hex_colour(),
            )
        else:
            pbar = None

        def func(line: ConversationLine):
            line.sentiments.load_scores()
            if pbar is not None:
                pbar.update(1)

        if not parallel:
            for line in self:
                func(line)
            if pbar is not None:
                pbar.close()
            return

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(lambda: func(line)) for line in self]
            for future in concurrent.futures.as_completed(futures):
                future.result()

        if pbar is not None:
            pbar.close()

    def load_tagged(self, parallel: bool = False, progress_bar: bool = False):
        if progress_bar:
            pbar = tqdm(
                total=len(self),
                desc=f"{self.code} tags",
                unit="lines",
                dynamic_ncols=True,
                colour=random_hex_colour(min_luma=0.3),
            )
        else:
            pbar = None

        def func(line: ConversationLine):
            _ = line.tagged
            if pbar is not None:
                pbar.update(1)

        if not parallel:
            for line in self:
                func(line)
            return

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(lambda: func(line)) for line in self]
            for future in concurrent.futures.as_completed(futures):
                future.result()

        if pbar is not None:
            pbar.close()

    def load_prosodic(self, parallel: bool = False):
        if not parallel:
            for line in self:
                line.load_prosodic()
            return

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(line.load_prosodic) for line in self]
            for future in concurrent.futures.as_completed(futures):
                future.result()

    def participant_lines(
        self,
        participant: Participant,
        valid_sentiments: bool = True,
        up_to_line: Optional[int] = None,
    ) -> ParticipantLines:
        lines = filter_series(
            self.lines[:up_to_line] if up_to_line is not None else self.lines,
            lambda line: line.participant == participant,
        )
        return ParticipantLines(
            participant,
            filter_series(
                lines, lambda line: not valid_sentiments or line.sentiments.has_scores()
            ),
        )

    def lines_by_participant(
        self, valid_sentiments: bool = True, up_to_line: Optional[int] = None
    ) -> dict[Participant, ParticipantLines]:
        result = {}
        for participant in self.participants:
            result[participant] = self.participant_lines(
                participant, valid_sentiments=valid_sentiments, up_to_line=up_to_line
            )
        return result
