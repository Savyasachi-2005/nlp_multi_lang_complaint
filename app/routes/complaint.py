from fastapi import APIRouter, HTTPException
from httpx import HTTPStatusError

try:
    from app.services.classifier import get_classifier_metrics, get_trained_classifier
    from app.services.preprocessing import preprocess_text
    from app.schemas.complaint import ComplaintRequest, ComplaintResponse
    from app.services.extractor import extract_complaint_details
    from app.services.formatter import format_complaint
    from app.services.sarvam import SarvamService
except ModuleNotFoundError:
    from services.classifier import get_classifier_metrics, get_trained_classifier
    from services.preprocessing import preprocess_text
    from schemas.complaint import ComplaintRequest, ComplaintResponse
    from services.extractor import extract_complaint_details
    from services.formatter import format_complaint
    from services.sarvam import SarvamService

router = APIRouter(tags=["complaints"])
SUPPORTED_TARGET_LANGUAGES = {"hi", "kn", "ta", "te", "mr"}


@router.get("/classifier-metrics")
async def classifier_metrics() -> dict[str, float]:
    return get_classifier_metrics()


@router.post("/process-complaint", response_model=ComplaintResponse)
async def process_complaint(payload: ComplaintRequest) -> ComplaintResponse:
    if payload.target_language not in SUPPORTED_TARGET_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail="target_language must be one of: hi, kn, ta, te, mr",
        )

    try:
        sarvam = SarvamService()

        detected_language = await sarvam.detect_language(payload.complaint_text)

        english_text = await sarvam.translate_text(
            payload.complaint_text,
            source_language=detected_language,
            target_language="en",
        )

        processed = preprocess_text(english_text)
        model_input_text = " ".join(processed.lemmatized_tokens) or english_text

        # Explicit feature extraction step in the processing pipeline.
        classifier_artifacts = get_trained_classifier()
        classifier_artifacts.feature_engineer.transform([model_input_text])

        details = extract_complaint_details(english_text)

        structured_complaint = format_complaint(
            complaint_type=details["complaint_type"],
            location=details["location"],
            complaint_text=english_text,
            issue_verbs=details.get("issue_verbs", ""),
        )

        # Translate section-wise so line breaks survive and the result looks like a letter.
        translated_sections: list[str] = []
        for section in structured_complaint.split("\n"):
            stripped = section.strip()
            if not stripped:
                continue
            translated_sections.append(
                await sarvam.translate_text(
                    stripped,
                    source_language="en",
                    target_language=payload.target_language,
                )
            )

        final_output = "\n\n".join(translated_sections)

        return ComplaintResponse(
            detected_language=detected_language,
            target_language=payload.target_language,
            complaint_type=details["complaint_type"],
            location=details["location"],
            final_output=final_output,
            classification_confidence=float(details.get("classification_confidence", "0") or 0),
            classification_method=details.get("classification_method", "default"),
        )
    except HTTPStatusError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Sarvam API error: {detail}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {exc}") from exc
