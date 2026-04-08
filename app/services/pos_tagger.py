import re

import nltk

try:
    from app.services.preprocessing import preprocess_text
except ModuleNotFoundError:
    from services.preprocessing import preprocess_text


def pos_tag_text(text: str) -> list[tuple[str, str]]:
    processed = preprocess_text(text)
    return nltk.pos_tag(processed.word_tokens)


def extract_nouns_and_verbs(text: str) -> dict[str, list[str]]:
    tagged_tokens = pos_tag_text(text)

    nouns = [token for token, tag in tagged_tokens if tag.startswith("NN")]
    verbs = [token for token, tag in tagged_tokens if tag.startswith("VB")]

    return {
        "nouns": nouns,
        "verbs": verbs,
    }


def extract_location_candidates(text: str) -> list[str]:
    tagged_tokens = pos_tag_text(text)
    candidates: list[str] = []
    buffer: list[str] = []

    for token, tag in tagged_tokens:
        cleaned = re.sub(r"[^A-Za-z]", "", token)
        if not cleaned:
            if buffer:
                candidates.append(" ".join(buffer))
                buffer = []
            continue

        if tag in {"NNP", "NNPS"}:
            buffer.append(cleaned)
        else:
            if len(buffer) >= 1:
                candidates.append(" ".join(buffer))
            buffer = []

    if buffer:
        candidates.append(" ".join(buffer))

    unique_candidates = []
    seen: set[str] = set()
    for candidate in candidates:
        key = candidate.lower()
        if key not in seen and len(candidate) > 2:
            unique_candidates.append(candidate)
            seen.add(key)

    return unique_candidates
