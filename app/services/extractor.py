import re

ALLOWED_TYPES = ["road", "water", "garbage", "electricity", "general"]

TYPE_KEYWORDS = {
    "road": ["road", "pothole", "street", "highway"],
    "water": ["water", "sewage", "drain", "pipeline", "tap"],
    "garbage": ["garbage", "waste", "trash", "dump"],
    "electricity": ["electricity", "power", "voltage", "transformer"],
}


def _keyword_score(text: str, complaint_type: str) -> int:
    keywords = TYPE_KEYWORDS.get(complaint_type, [])
    return sum(1 for word in keywords if word in text)


def extract_complaint_type(text: str) -> str:
    lowered = text.lower()

    if any(word in lowered for word in TYPE_KEYWORDS["road"]):
        return "road"
    if any(word in lowered for word in TYPE_KEYWORDS["water"]):
        return "water"
    if any(word in lowered for word in TYPE_KEYWORDS["garbage"]):
        return "garbage"
    if any(word in lowered for word in TYPE_KEYWORDS["electricity"]):
        return "electricity"

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
    pattern = r"\b(?:in|at|near|from)\s+([A-Za-z][A-Za-z\s\-]{2,60})"
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return "Unknown location"

    location = match.group(1).strip()
    location = re.sub(r"\s+", " ", location)
    return location.rstrip(".,")


def extract_complaint_details(text: str) -> dict[str, str]:
    extracted_type = extract_complaint_type(text)
    complaint_type = validate_complaint_type(extracted_type, text)
    location = extract_location(text)

    if complaint_type not in ALLOWED_TYPES:
        complaint_type = "general"

    return {
        "complaint_type": complaint_type,
        "location": location,
    }
