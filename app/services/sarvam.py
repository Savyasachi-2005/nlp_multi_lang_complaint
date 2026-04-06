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

        payload = {
            "input": text,
            "source_language_code": self._to_sarvam_language_code(source_language),
            "target_language_code": self._to_sarvam_language_code(target_language),
            "speaker_gender": "Male",
            "mode": "formal",
            "model": "mayura:v1",
            "enable_preprocessing": False,
            "numerals_format": "native",
        }

        data = await self._post("/translate", payload)

        translated = data.get("translated_text")
        if translated and isinstance(translated, str):
            return translated

        output = data.get("output")
        if isinstance(output, list) and output and isinstance(output[0], str):
            return output[0]

        raise RuntimeError("Could not parse translated text from Sarvam API response")
