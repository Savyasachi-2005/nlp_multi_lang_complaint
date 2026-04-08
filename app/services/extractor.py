import re

try:
    from app.services.classifier import predict_with_confidence
    from app.services.pos_tagger import extract_location_candidates, extract_nouns_and_verbs
    from app.services.wordnet_utils import expand_keywords, map_to_domain
except ModuleNotFoundError:
    from services.classifier import predict_with_confidence
    from services.pos_tagger import extract_location_candidates, extract_nouns_and_verbs
    from services.wordnet_utils import expand_keywords, map_to_domain

ALLOWED_TYPES = ["road", "water", "garbage", "electricity", "general"]

TYPE_KEYWORDS = {
    "road": ["road", "pothole", "street", "highway"],
    "water": ["water", "sewage", "drain", "pipeline", "tap"],
    "garbage": ["garbage", "waste", "trash", "dump"],
    "electricity": ["electricity", "power", "voltage", "transformer"],
}

EXPANDED_TYPE_KEYWORDS = {
    issue_type: expand_keywords(seed_words)
    for issue_type, seed_words in TYPE_KEYWORDS.items()
}


def _keyword_score(text: str, complaint_type: str) -> int:
    keywords = EXPANDED_TYPE_KEYWORDS.get(complaint_type, set())
    token_set = set(re.findall(r"[a-zA-Z]+", text.lower()))
    return sum(1 for word in keywords if word in token_set)


def _rule_based_type(text: str) -> tuple[str, int]:
    lowered = text.lower()
    best_type = "general"
    best_score = 0

    for issue_type in ["road", "water", "garbage", "electricity"]:
        score = _keyword_score(lowered, issue_type)
        if score > best_score:
            best_type = issue_type
            best_score = score

    return best_type, best_score


def extract_complaint_type(text: str) -> str:
    ml_type, ml_confidence = predict_with_confidence(text)
    rule_type, rule_score = _rule_based_type(text)

    if ml_type in ALLOWED_TYPES and ml_confidence >= 0.45:
        return ml_type

    if rule_score > 0:
        return rule_type

    nouns = extract_nouns_and_verbs(text).get("nouns", [])
    for noun in nouns:
        mapped = map_to_domain(noun)
        if mapped:
            return mapped

    return "general"


def validate_complaint_type(complaint_type: str, text: str) -> str:
    lowered = text.lower()
    if complaint_type == "general":
        return "general"

    current_score = _keyword_score(lowered, complaint_type)
    if current_score > 0:
        return complaint_type

    best_type = "general"
    best_score = 0
    for item in ["road", "water", "garbage", "electricity"]:
        score = _keyword_score(lowered, item)
        if score > best_score:
            best_type = item
            best_score = score

    return best_type if best_score > 0 else "general"


def extract_location(text: str) -> str:
    patterns = [
        r"\b(?:in|at|near|from|on)\s+([A-Za-z][A-Za-z\s\-]{2,60})",
        r"\b(?:ward|sector|area|colony)\s*(?:no\.?\s*)?(\d+[A-Za-z\-]*)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            location = re.sub(r"\s+", " ", match.group(1).strip())
            return location.rstrip(".,")

    candidates = extract_location_candidates(text)
    if candidates:
        return candidates[0]

    return "Unknown location"


def extract_complaint_details(text: str) -> dict[str, str]:
    extracted_type = extract_complaint_type(text)
    complaint_type = validate_complaint_type(extracted_type, text)
    location = extract_location(text)
    linguistic = extract_nouns_and_verbs(text)
    issue_verbs = linguistic.get("verbs", [])

    if complaint_type not in ALLOWED_TYPES:
        complaint_type = "general"

    return {
        "complaint_type": complaint_type,
        "location": location,
        "issue_verbs": ", ".join(issue_verbs[:4]) if issue_verbs else "",
    }
