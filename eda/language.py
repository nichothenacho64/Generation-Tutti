from typing import Optional, Self, final

import spacy
from nltk.corpus import stopwords

nlp = spacy.load("it_core_news_sm")
italian_stopwords = frozenset(stopwords.words("italian"))

# Obtained from https://universaldependencies.org/u/pos/
# and modified
_POS_NAMES = {
    "NOUN": "Noun",
    "VERB": "Verb",
    "ADV": "Adverb",
    "ADJ": "Adjective",
    "DET": "Determiner",
    "INTJ": "Interjection",
    "PRON": "Pronoun",
    "AUX": "Auxiliary Verb",
    "PROPN": "Proper Noun",
    "CCONJ": "Coordinating Conj.",
    "ADP": "Adposition",
    "SYM": "Symbol",
    "X": "Other",
    "NUM": "Numeral",
    "SCONJ": "Subordinating Conj.",
}

@final
class TaggedText(str):
    _lemma: str
    _pos: str
    _entity_type: Optional[str]

    def __new__(cls, value: str, lemma: str, pos: str, entity_type: Optional[str] = None) -> Self:
        self = super().__new__(cls, value)
        self._lemma = lemma
        self._pos = pos
        self._entity_type = entity_type or None
        return self

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}({super().__repr__()}, " +
            f"lemma={self._lemma!r}, pos={self._pos!r}" +
            (f", entity_type={self.entity_type!r})" if self._entity_type is not None else ")")
        )

    def __str__(self) -> str:
        return super().__str__()

    @property
    def lemma(self) -> str:
        return self._lemma

    @property
    def pos(self) -> str:
        return self._pos

    @property
    def pos_name(self) -> str:
        return _POS_NAMES[self._pos]

    @property
    def entity_type(self) -> Optional[str]:
        return self._entity_type

def tag(text: str, *, include_stopwords: bool = False) -> list[TaggedText]:
    doc = nlp(text)
    tagged = []
    for token in doc:
        if not token.is_alpha or token.pos_ == "PUNCT":
            continue
        if not include_stopwords and (token.is_stop or token.text in italian_stopwords):
            continue

        tagged_word = TaggedText(
            token.text,
            token.lemma_,
            token.pos_,
            token.ent_type_
        )
        tagged.append(tagged_word)
    return tagged
