from pydantic import BaseModel, Field


class ComplaintRequest(BaseModel):
    complaint_text: str = Field(..., min_length=3, max_length=5000)
    target_language: str = Field(..., pattern="^(hi|kn|ta|te|mr)$")


class ComplaintResponse(BaseModel):
    detected_language: str
    target_language: str
    complaint_type: str
    location: str
    final_output: str
    classification_confidence: float | None = None
    classification_method: str | None = None
