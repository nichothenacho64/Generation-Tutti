import enum
import hashlib
import json
import time
from collections import Counter
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from typing import Final, Optional, Self, cast
from urllib.error import HTTPError, URLError

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from eda.llm import translate_llm
from eda.utils import FOLDER_DIR

type PolarityScores = dict[str, float]
type ScoresEntry = dict[str, Optional[str | PolarityScores]]

INDETERMINATE_SCORES = {"pos": -5.0, "neg": -5.0, "neu": -5.0, "compound": -5.0}


def encode_text_hashed(text: str) -> str:
    return hashlib.sha256(text.encode(encoding="utf-8")).hexdigest()


class _PolarityScoresCache:
    def __init__(self):
        self._analyser = SentimentIntensityAnalyzer()

    def get(self, text: str, conversation_code: str) -> PolarityScores:
        scores_by_text = self._load_entries(conversation_code)
        hashed_text = encode_text_hashed(text)
        if hashed_text in scores_by_text:
            return cast(PolarityScores, scores_by_text[hashed_text]["scores"])

        try:
            retries = 0
            while True:
                try:
                    scores = self._analyser.polarity_scores(text)
                except (HTTPError, URLError):
                    time.sleep(0.5)
                else:
                    break

                if retries == 3:
                    raise ValueError
        except (IndexError, ValueError):
            retries = 0
            while True:
                translated_text = translate_llm(text)
                try:
                    scores = self._analyser.polarity_scores(text)
                except IndexError:
                    retries += 1
                else:
                    break

                if retries == 3:
                    scores = INDETERMINATE_SCORES
                    translated_text = None
                    break
            entry = {"scores": scores, "translation": translated_text}
        else:
            entry = {"scores": scores}

        scores_by_text[hashed_text] = cast(ScoresEntry, entry)
        self._save_entries(conversation_code, scores_by_text)
        return scores

    def _get_scores_path(self, conversation_code: str) -> Path:
        path = FOLDER_DIR / "scores" / f"polarity_scores_{conversation_code}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def _load_entries(self, conversation_code: str) -> dict[str, ScoresEntry]:
        scores_path = self._get_scores_path(conversation_code)
        if not scores_path.exists():
            scores_path.write_text(json.dumps({}, indent=4))
        with scores_path.open("r") as saved_scores:
            return json.load(saved_scores)

    def _save_entries(self, conversation_code: str, scores: dict[str, ScoresEntry]):
        scores_path = self._get_scores_path(conversation_code)
        with scores_path.open("w") as saved_scores:
            json.dump(scores, saved_scores, indent=4, ensure_ascii=False)


_polarity_scores_cache: Final = _PolarityScoresCache()


class SentimentType(enum.StrEnum):
    POSITIVE = "pos"
    NEGATIVE = "neg"
    NEUTRAL = "neu"
    COMPOUND = "compound"

    @property
    def display_name(self) -> str:
        return self.name.lower()

    @property
    def default_colour(self) -> str:
        match self:
            case SentimentType.POSITIVE:
                return "gold"
            case SentimentType.NEGATIVE:
                return "indigo"
            case SentimentType.NEUTRAL:
                return "darkseagreen"
            case SentimentType.COMPOUND:
                return "lightpink"


@dataclass
class ScoredSentiment:
    score: float
    type: SentimentType

    def __lt__(self, other: Self) -> bool:
        return self.score < other.score


class TextSentiments:
    def __init__(self, text: str, conversation_code: str):
        self._text = text
        self._conversation_code = conversation_code
        self._raw_scores: Optional[PolarityScores] = None

    def __repr__(self) -> str:
        if self._raw_scores is None:
            return f"{self.__class__.__name__}()"
        else:
            sentiment_scores = (
                f"positive={self.positive}, negative={self.negative}, "
                f"neutral={self.neutral}, compound={self.compound}"
            )
            return f"{self.__class__.__name__}({sentiment_scores})"

    @property
    def score_counts(self) -> Counter:
        return Counter(self._scores)

    @property
    def _scores(self) -> PolarityScores:
        if self._raw_scores is None:
            self._raw_scores = _polarity_scores_cache.get(
                self._text, self._conversation_code
            )
        return self._raw_scores

    @staticmethod
    def _score_property(sentiment_type: SentimentType) -> cached_property[float]:
        def fget(self: "TextSentiments") -> float:
            return self._scores[sentiment_type.value]

        return cached_property(fget)

    def has_scores(self) -> bool:
        return self._scores != INDETERMINATE_SCORES

    def has_loaded_scores(self) -> bool:
        return self._raw_scores is not None

    def load_scores(self):
        if self._raw_scores is None:
            self._raw_scores = _polarity_scores_cache.get(
                self._text, self._conversation_code
            )

    def prevailing_sentiment(self) -> ScoredSentiment:
        return max(
            ScoredSentiment(score, SentimentType(sentiment_name))
            for sentiment_name, score in self._scores.items()
        )

    positive = _score_property(SentimentType.POSITIVE)
    negative = _score_property(SentimentType.NEGATIVE)
    neutral = _score_property(SentimentType.NEUTRAL)
    compound = _score_property(SentimentType.COMPOUND)
