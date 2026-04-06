from fastapi import APIRouter, HTTPException
from httpx import HTTPStatusError

try:
    from app.schemas.complaint import ComplaintRequest, ComplaintResponse
    from app.services.extractor import extract_complaint_details
    from app.services.formatter import format_complaint
    from app.services.sarvam import SarvamService
except ModuleNotFoundError:
    from schemas.complaint import ComplaintRequest, ComplaintResponse
    from services.extractor import extract_complaint_details
    from services.formatter import format_complaint
    from services.sarvam import SarvamService

router = APIRouter(tags=["complaints"])
SUPPORTED_TARGET_LANGUAGES = {"hi", "kn", "ta", "te", "mr"}


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

        details = extract_complaint_details(english_text)

        structured_complaint = format_complaint(
            complaint_type=details["complaint_type"],
            location=details["location"],
        )

        final_output = await sarvam.translate_text(
            structured_complaint,
            source_language="en",
            target_language=payload.target_language,
        )

        return ComplaintResponse(
            detected_language=detected_language,
            complaint_type=details["complaint_type"],
            location=details["location"],
            final_output=final_output,
        )
    except HTTPStatusError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Sarvam API error: {detail}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {exc}") from exc
