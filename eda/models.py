import enum
import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from functools import cached_property
from typing import ClassVar, Self

import pandas as pd

from eda.sentiments import TextSentiments
from eda.utils import filter_series, truthy_tuple

# Based on the oldest (recorded) person to ever live, Jeanne Calment
# https://en.wikipedia.org/wiki/Jeanne_Calment
# In any case this doesn't matter since comparisons are all based on
# less than, or greater than.
_OLDEST_POSSIBLE_AGE = 122
_OVER_AGE = -1
_OVER_EIGHTY_FIVE = "over 85"

def _normalise_simple(phrase: str) -> str:
    lowercased_phrase = phrase.lower()
    phrase_without_pauses = re.sub(
        r"\(\.\) ",
        "",
        lowercased_phrase
    )
    phrase_without_unknowns = re.sub(
        r"x{2,} ",
        "",
        phrase_without_pauses
    )
    phrase_without_ps = re.sub(
        r"\{p\} ",
        "",
        phrase_without_unknowns
    )
    normalised_phrase = re.sub(
        r"[\[\]<>°.?:()]|\.(?<=[A-Za-z])",
        "",
        phrase_without_ps
    )
    return normalised_phrase

class MacroRegion(enum.Enum):
    CENTRE = enum.auto()
    NORTH = enum.auto()
    SOUTH = enum.auto()

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
    def parse(cls, value: str):
        if value == _OVER_EIGHTY_FIVE:
            return cls(youngest_age=85, oldest_age=_OLDEST_POSSIBLE_AGE)
        else:
            return cls(*map(int, value.split('-')))

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
    BOOMER: ClassVar[Self]

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


Generation.Z = gen_z = Generation("Generation Z", AgeRange(16, 30))
Generation.Y = gen_y = Generation("Generation Y", AgeRange(31, 50))
Generation.X = gen_x = Generation("Generation X", AgeRange(51, 65))
Generation.BOOMER = boomer = Generation("Baby Boomer", AgeRange(66, _OVER_AGE))
Generation.register(gen_z, gen_y, gen_x, boomer)

@dataclass(frozen=True)
class Participant:
    code: str
    geographic_origin: str
    age_range: AgeRange
    generation: Generation
    mother_tongue: str
    conversation_code: str

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Participant):
            return self.code == other.code
        raise NotImplementedError

_OVERLAPPING_PATTERN = re.compile(r"\[(.+?)\]")
_SPED_UP_PATTERN = re.compile(r">(.+?)<")
_SLOW_DOWN_PATTERN = re.compile(r"<(.+?)>")
_LOW_VOLUME_PATTERN = re.compile(r"°(.+?)°")
_RAISED_VOLUME_PATTERN = re.compile(r"[A-Z]+")

@dataclass
class ConversationLine:
    conversation_code: str
    tu_id: int
    participant: Participant
    text: str
    normalised_words: list[str]
    normalised_text: str = field(init=False)
    sentiments: TextSentiments = field(init=False)

    def __post_init__(self):
        self.normalised_text = ' '.join(self.normalised_words)
        self.sentiments = TextSentiments(
            _normalise_simple(self.normalised_text),
            self.conversation_code
        )

    @staticmethod
    def _property_factory(pattern: re.Pattern[str]) -> cached_property[tuple[str, ...]]:
        def fget(self: "ConversationLine") -> tuple[str, ...]:
            return truthy_tuple(
                _normalise_simple(match.group(1))
                for match in pattern.finditer(self.text)
            )
        return cached_property(fget)

    overlapping_phrases = _property_factory(_OVERLAPPING_PATTERN)
    sped_up_phrases = _property_factory(_SPED_UP_PATTERN)
    slowed_down_phrases = _property_factory(_SLOW_DOWN_PATTERN)
    low_volume_phrases = _property_factory(_LOW_VOLUME_PATTERN)
    raised_volume_phrases = _property_factory(_RAISED_VOLUME_PATTERN)

@dataclass
class ParticipantLines:
    participant: Participant
    lines: pd.Series

    def __iter__(self) -> Iterator[ConversationLine]:
        return iter(self.lines)

@dataclass
class Conversation:
    code: str
    participants: list[Participant]
    lines: pd.Series

    def __iter__(self) -> Iterator[ConversationLine]:
        return iter(self.lines)

    def participant_lines(self, participant: Participant, valid_sentiments: bool = True) -> ParticipantLines:
        def filter_sentiment(line: ConversationLine) -> bool:
            if not valid_sentiments:
                return True
            else:
                return line.sentiments.has_scores()

        lines = filter_series(
            self.lines,
            lambda line: line.participant == participant
        )
        return ParticipantLines(
            participant,
            filter_series(lines, lambda line: filter_sentiment(line))
        )

    def lines_by_participant(self, valid_sentiments: bool = True) -> dict[Participant, ParticipantLines]:
        result = {}
        for participant in self.participants:
            result[participant] = self.participant_lines(
                participant,
                valid_sentiments=valid_sentiments
            )
        return result
