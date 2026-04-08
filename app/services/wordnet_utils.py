from nltk.corpus import wordnet as wn

try:
    from app.services.preprocessing import ensure_nltk_resources
except ModuleNotFoundError:
    from services.preprocessing import ensure_nltk_resources


SEED_TERMS = {
    "road": {"road", "street", "pothole", "highway", "asphalt"},
    "water": {"water", "sewage", "pipeline", "drain", "tap"},
    "electricity": {"electricity", "power", "voltage", "transformer", "outage"},
    "garbage": {"garbage", "waste", "trash", "litter", "dump"},
}


ensure_nltk_resources()


def get_synonyms(word: str, max_synonyms: int = 10) -> list[str]:
    synonyms: set[str] = set()
    for synset in wn.synsets(word):
        for lemma in synset.lemmas():
            name = lemma.name().replace("_", " ").lower()
            if name.isascii():
                synonyms.add(name)
            if len(synonyms) >= max_synonyms:
                return sorted(synonyms)
    return sorted(synonyms)


def semantic_similarity(word_a: str, word_b: str) -> float:
    synsets_a = wn.synsets(word_a)
    synsets_b = wn.synsets(word_b)
    best_score = 0.0

    for syn_a in synsets_a:
        for syn_b in synsets_b:
            score = syn_a.path_similarity(syn_b) or 0.0
            if score > best_score:
                best_score = score

    return float(best_score)


def expand_keywords(seed_words: list[str]) -> set[str]:
    expanded = {word.lower() for word in seed_words}
    for word in seed_words:
        expanded.update(get_synonyms(word))
    return {item for item in expanded if item and item.replace(" ", "").isalpha()}


def map_to_domain(token: str, threshold: float = 0.2) -> str | None:
    lowered = token.lower().strip()
    if not lowered:
        return None

    for domain, seeds in SEED_TERMS.items():
        if lowered in seeds:
            return domain

    best_domain = None
    best_score = 0.0
    for domain, seeds in SEED_TERMS.items():
        for seed in seeds:
            score = semantic_similarity(lowered, seed)
            if score > best_score:
                best_score = score
                best_domain = domain

    if best_score >= threshold:
        return best_domain
    return None
