import json
from functools import cached_property
from pathlib import Path
from typing import Optional, cast

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from eda.llm import translate_llm
from eda.utils import FOLDER_DIR

type PolarityScores = dict[str, float]
type ScoresEntry = dict[str, str | PolarityScores]

INDETERMINATE_SCORES = {"pos": -5.0, "neg": -5.0, "neu": -5.0, "compound": -5.0}

class _PolarityScoresCache:
    def __init__(self):
        self._analyser = SentimentIntensityAnalyzer()

    def get(self, text: str, conversation_code: str) -> PolarityScores:
        scores_by_text = self._load_entries(conversation_code)
        if text in scores_by_text:
            return cast(PolarityScores, scores_by_text[text]["scores"])

        try:
            scores = self._analyser.polarity_scores(text)
        except IndexError:
            retries = 0
            while True:
                translated_text = translate_llm(text)
                try:
                    scores = self._analyser.polarity_scores(translated_text)
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

        scores_by_text[text] = cast(ScoresEntry, entry)
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

_polarity_scores_cache = _PolarityScoresCache()

class TextSentiments:
    def __init__(self, text: str, conversation_code: str):
        self._text = text
        self._conversation_code = conversation_code
        self._scores: Optional[PolarityScores] = None

    def __repr__(self) -> str:
        if self._scores is None:
            return f"{self.__class__.__name__}()"
        else:
            sentiment_scores = (
                f"positive={self.positive}, negative={self.negative}, "
                f"neutral={self.neutral}, compound={self.compound}"
            )
            return f"{self.__class__.__name__}({sentiment_scores})"

    @staticmethod
    def _score_property(score_name: str) -> cached_property[float]:
        def fget(self: "TextSentiments") -> float:
            if self._scores is not None:
                return self._scores[score_name]

            self._scores = scores = _polarity_scores_cache.get(self._text, self._conversation_code)
            return scores[score_name]
        return cached_property(fget)

    def has_scores(self) -> bool:
        if self._scores is None:
            self._scores = _polarity_scores_cache.get(self._text, self._conversation_code)
        return self._scores != INDETERMINATE_SCORES

    positive = _score_property("pos")
    negative = _score_property("neg")
    neutral = _score_property("neu")
    compound = _score_property("compound")
