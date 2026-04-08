try:
    from app.services.ngram import AddOneNGramLanguageModel
except ModuleNotFoundError:
    from services.ngram import AddOneNGramLanguageModel


SUBJECT_MAP = {
    "road": "Road Infrastructure Repair Request",
    "water": "Water Supply and Sanitation Complaint",
    "garbage": "Solid Waste Management Complaint",
    "electricity": "Electricity Service Disruption Complaint",
    "general": "Public Civic Service Complaint",
}

DESCRIPTION_STEMS = {
    "road": "The road condition in this area is hazardous and requires immediate repair",
    "water": "The residents are facing severe water-related service disruption in this area",
    "garbage": "Irregular garbage collection has created an unhygienic condition in this area",
    "electricity": "Unstable electricity supply has disrupted normal activities in this area",
    "general": "The citizens are facing a recurring civic issue that needs administrative attention",
}

REQUEST_MAP = {
    "road": "I request the municipal road maintenance team to inspect and repair the damaged stretch at the earliest.",
    "water": "I request the water department to restore normal supply and resolve the sanitation concern immediately.",
    "garbage": "I request the sanitation department to ensure regular waste collection and proper disposal.",
    "electricity": "I request the electricity board to resolve the outage and stabilize the voltage supply.",
    "general": "I request the concerned department to investigate and resolve this issue promptly.",
}

_LM_CORPUS = list(DESCRIPTION_STEMS.values()) + [
    "Immediate intervention will help prevent inconvenience to residents",
    "Prompt administrative action is necessary to address public grievances",
]

_language_model = AddOneNGramLanguageModel(n=2)
_language_model.fit(_LM_CORPUS)


def _enhance_description(base_description: str) -> str:
    generated = _language_model.complete_phrase(base_description, max_words=4)
    if not generated:
        return base_description
    return generated[0].upper() + generated[1:] + "."


def format_complaint(
    *,
    complaint_type: str,
    location: str,
    complaint_text: str | None = None,
    issue_verbs: str | None = None,
) -> str:
    safe_type = complaint_type if complaint_type in SUBJECT_MAP else "general"
    safe_location = (location or "the reported area").strip()

    subject = SUBJECT_MAP[safe_type]
    description = _enhance_description(DESCRIPTION_STEMS[safe_type])
    request_line = REQUEST_MAP[safe_type]
    action_context = f"Reported location: {safe_location}."

    if issue_verbs:
        action_context += f" Observed issue actions: {issue_verbs}."

    if complaint_text:
        action_context += " Complaint source has been analyzed through a local NLP pipeline."

    return "\n".join(
        [
            f"Subject: {subject}",
            "Greeting: Respected Sir/Madam,",
            f"Description: {description}",
            f"Details: {action_context}",
            f"Request: {request_line}",
            "Closing: Thank you for your prompt action.",
        ]
    )
