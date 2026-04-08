import re
import unicodedata
from dataclasses import dataclass

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import sent_tokenize, word_tokenize

_NLTK_RESOURCE_MAP = {
    "punkt": "tokenizers/punkt",
    "punkt_tab": "tokenizers/punkt_tab",
    "stopwords": "corpora/stopwords",
    "wordnet": "corpora/wordnet",
    "omw-1.4": "corpora/omw-1.4",
    "averaged_perceptron_tagger": "taggers/averaged_perceptron_tagger",
    "averaged_perceptron_tagger_eng": "taggers/averaged_perceptron_tagger_eng",
}

_PUNCT_PATTERN = re.compile(r"[^\w\s]")
_nltk_ready = False


@dataclass(frozen=True)
class PreprocessingResult:
    original_text: str
    normalized_text: str
    lowered_text: str
    punctuation_removed_text: str
    sentences: list[str]
    word_tokens: list[str]
    filtered_tokens: list[str]
    lemmatized_tokens: list[str]


def ensure_nltk_resources() -> None:
    global _nltk_ready
    if _nltk_ready:
        return

    for package, resource_path in _NLTK_RESOURCE_MAP.items():
        try:
            nltk.data.find(resource_path)
        except LookupError:
            nltk.download(package, quiet=True)

    _nltk_ready = True


def normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", text or "")


def _remove_punctuation(text: str) -> str:
    return _PUNCT_PATTERN.sub(" ", text)


def preprocess_text(text: str, language: str = "english") -> PreprocessingResult:
    ensure_nltk_resources()

    normalized = normalize_unicode(text)
    lowered = normalized.lower().strip()
    punctuation_removed = _remove_punctuation(lowered)

    sentences = sent_tokenize(normalized)
    word_tokens = word_tokenize(punctuation_removed)

    stop_words = set(stopwords.words(language))
    filtered_tokens = [token for token in word_tokens if token.isalpha() and token not in stop_words]

    lemmatizer = WordNetLemmatizer()
    lemmatized_tokens = [lemmatizer.lemmatize(token) for token in filtered_tokens]

    return PreprocessingResult(
        original_text=text,
        normalized_text=normalized,
        lowered_text=lowered,
        punctuation_removed_text=punctuation_removed,
        sentences=sentences,
        word_tokens=word_tokens,
        filtered_tokens=filtered_tokens,
        lemmatized_tokens=lemmatized_tokens,
    )


def preprocess_for_model(text: str) -> str:
    processed = preprocess_text(text)
    return " ".join(processed.lemmatized_tokens)
