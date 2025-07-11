import re
from dataclasses import dataclass
from functools import cached_property

from eda.utils import truthy_list

# Based on the oldest (recorded) person to ever live, Jeanne Calment
# https://en.wikipedia.org/wiki/Jeanne_Calment
# In any case this doesn't matter since comparisons are all based on
# less than, or greater than.
_OLDEST_POSSIBLE_AGE = 122

def _normalise_simple(phrase: str) -> str:
    lowercased_phrase = phrase.lower()
    phrase_without_pauses = re.sub(
        r"\(\.\) ", 
        "", 
        lowercased_phrase
    )
    phrase_without_unknowns = re.sub(
        r"x{2,}", 
        "", 
        phrase_without_pauses
    )
    normalised_phrase = re.sub(
        r"[\[\]<>°.?:()]|\.(?<=[A-Za-z])", 
        "", 
        phrase_without_unknowns
    )
    return normalised_phrase

@dataclass
class AgeRange:
    youngest_age: int
    oldest_age: int

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.youngest_age}—{self.oldest_age})"

    @classmethod
    def parse(cls, value: str):
        if value == "over 85":
            return cls(youngest_age=85, oldest_age=_OLDEST_POSSIBLE_AGE)
        else:
            return cls(*map(int, value.split('-')))

@dataclass
class Participant:
    code: str
    geographic_origin: str
    age_range: AgeRange
    mother_tongue: str

_OVERLAPPING_PATTERN = re.compile(r"\[(.+?)\]")
_SPED_UP_PATTERN = re.compile(r">(.+?)<")
_SLOW_DOWN_PATTERN = re.compile(r"<(.+?)>")
_LOW_VOLUME_PATTERN = re.compile(r"°(.+?)°")
_RAISED_VOLUME_PATTERN = re.compile(r"[A-Z]+")

@dataclass
class ConversationLine:
    participant: Participant
    text: str
    normalised_words: list[str]

    @cached_property
    def normalised_text(self) -> str:
        return ' '.join(self.normalised_words)
    
    @staticmethod
    def _property_factory(pattern: re.Pattern[str]) -> cached_property[list[str]]:
        def fget(self: "ConversationLine") -> list[str]:
            return truthy_list(
                _normalise_simple(match.group(1))
                for match in pattern.finditer(self.text)
            )
        
        return cached_property(fget)
    
    overlapping_phrases = _property_factory(_OVERLAPPING_PATTERN)
    sped_up_phrases = _property_factory(_SPED_UP_PATTERN)
    slowed_down_phrases = _property_factory(_SLOW_DOWN_PATTERN)
    low_volume_phrases = _property_factory(_LOW_VOLUME_PATTERN)
    raised_volume_phrases = _property_factory(_RAISED_VOLUME_PATTERN)
