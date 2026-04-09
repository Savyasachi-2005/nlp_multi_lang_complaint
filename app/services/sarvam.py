import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)


class SarvamService:
    def __init__(self) -> None:
        self.api_key = os.getenv("SARVAM_API_KEY", "")
        self.base_url = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai").rstrip("/")

        if not self.api_key:
            raise RuntimeError("SARVAM_API_KEY is not set")

        self.headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

    async def _post(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            print(f"[Sarvam] POST URL: {url}")
            print(f"[Sarvam] Payload: {payload}")
            response = await client.post(url, headers=self.headers, json=payload)
            print(f"[Sarvam] Status: {response.status_code}")
            print(f"[Sarvam] Response: {response.text}")

            if response.status_code != 200:
                raise RuntimeError(
                    f"Sarvam API request failed with status {response.status_code}: {response.text}"
                )

            data = response.json()
            if not isinstance(data, dict):
                raise RuntimeError("Unexpected Sarvam API response format")
            return data

    @staticmethod
    def _normalize_language_code(code: str) -> str:
        if not code:
            return "en"

        normalized = code.lower().strip()
        mapping = {
            "en-in": "en",
            "hi-in": "hi",
            "kn-in": "kn",
            "ta-in": "ta",
            "te-in": "te",
            "mr-in": "mr",
        }
        if normalized in mapping:
            return mapping[normalized]

        if "-" in normalized:
            return normalized.split("-", 1)[0]

        return normalized

    @staticmethod
    def _to_sarvam_language_code(code: str) -> str:
        normalized = code.lower().strip()
        mapping = {
            "en": "en-IN",
            "hi": "hi-IN",
            "kn": "kn-IN",
            "ta": "ta-IN",
            "te": "te-IN",
            "mr": "mr-IN",
            "en-in": "en-IN",
            "hi-in": "hi-IN",
            "kn-in": "kn-IN",
            "ta-in": "ta-IN",
            "te-in": "te-IN",
            "mr-in": "mr-IN",
        }
        if normalized in mapping:
            return mapping[normalized]
        raise RuntimeError(f"Unsupported language code: {code}")

    @staticmethod
    def _to_base_language_code(code: str) -> str:
        normalized = code.lower().strip()
        mapping = {
            "en": "en",
            "hi": "hi",
            "kn": "kn",
            "ta": "ta",
            "te": "te",
            "mr": "mr",
            "en-in": "en",
            "hi-in": "hi",
            "kn-in": "kn",
            "ta-in": "ta",
            "te-in": "te",
            "mr-in": "mr",
        }
        if normalized in mapping:
            return mapping[normalized]
        if "-" in normalized:
            return normalized.split("-", 1)[0]
        return normalized

    @staticmethod
    def _looks_like_target_script(text: str, target_language: str) -> bool:
        if not text or not text.strip():
            return False

        ranges = {
            "hi": (0x0900, 0x097F),
            "mr": (0x0900, 0x097F),
            "kn": (0x0C80, 0x0CFF),
            "ta": (0x0B80, 0x0BFF),
            "te": (0x0C00, 0x0C7F),
        }

        normalized_target = SarvamService._to_base_language_code(target_language)
        if normalized_target not in ranges:
            return True

        start, end = ranges[normalized_target]
        matched = sum(1 for ch in text if start <= ord(ch) <= end)
        indic_total = sum(1 for ch in text if 0x0900 <= ord(ch) <= 0x0D7F)

        if indic_total == 0:
            return False

        return matched / indic_total >= 0.55

    def _build_translate_payload(
        self,
        *,
        text: str,
        source_language: str,
        target_language: str,
        use_base_codes: bool,
    ) -> dict[str, Any]:
        if use_base_codes:
            source_code = self._to_base_language_code(source_language)
            target_code = self._to_base_language_code(target_language)
        else:
            source_code = self._to_sarvam_language_code(source_language)
            target_code = self._to_sarvam_language_code(target_language)

        payload = {
            "input": text,
            "source_language_code": source_code,
            "target_language_code": target_code,
            "speaker_gender": "Male",
            "mode": "formal",
            "model": "mayura:v1",
            "enable_preprocessing": False,
            "numerals_format": "native",
        }

        if use_base_codes:
            payload.pop("model", None)

        return payload

    async def detect_language(self, text: str) -> str:
        if not text or not text.strip():
            return "en"

        # Basic local detection to avoid relying on non-official endpoints.
        for ch in text:
            code_point = ord(ch)
            if 0x0900 <= code_point <= 0x097F:
                return "hi"
            if 0x0C80 <= code_point <= 0x0CFF:
                return "kn"
        return "en"

    async def translate_text(self, text: str, source_language: str, target_language: str) -> str:
        if not text or not text.strip():
            raise RuntimeError("Input text is empty")

        if source_language == target_language:
            return text

        payload = self._build_translate_payload(
            text=text,
            source_language=source_language,
            target_language=target_language,
            use_base_codes=False,
        )

        data = await self._post("/translate", payload)

        translated = data.get("translated_text")
        if not (translated and isinstance(translated, str)):
            output = data.get("output")
            if isinstance(output, list) and output and isinstance(output[0], str):
                translated = output[0]

        if translated and isinstance(translated, str):
            base_target = self._to_base_language_code(target_language)
            if base_target in {"kn", "ta", "te"} and not self._looks_like_target_script(
                translated, target_language
            ):
                fallback_payload = self._build_translate_payload(
                    text=text,
                    source_language=source_language,
                    target_language=target_language,
                    use_base_codes=True,
                )
                fallback_data = await self._post("/translate", fallback_payload)
                fallback_translated = fallback_data.get("translated_text")
                if not (fallback_translated and isinstance(fallback_translated, str)):
                    fallback_output = fallback_data.get("output")
                    if (
                        isinstance(fallback_output, list)
                        and fallback_output
                        and isinstance(fallback_output[0], str)
                    ):
                        fallback_translated = fallback_output[0]

                if fallback_translated and isinstance(fallback_translated, str):
                    return fallback_translated

            return translated

        raise RuntimeError("Could not parse translated text from Sarvam API response")
