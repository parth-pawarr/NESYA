"""
Translation service helpers for converting non-English input to English.
"""
import re
from typing import Optional

import httpx

GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"

NON_ENGLISH_DETECTOR = re.compile(r"[\u0900-\u097F]")


def contains_non_english_text(text: str) -> bool:
    return bool(NON_ENGLISH_DETECTOR.search(text))


def _parse_translation_payload(payload: list) -> tuple[str, str]:
    """Extract translated text and detected source language from Google payload."""
    translated_text = ""
    if payload and isinstance(payload, list) and payload[0]:
        for segment in payload[0]:
            if segment and segment[0]:
                translated_text += segment[0]

    source_language = "auto"
    if len(payload) > 2 and isinstance(payload[2], str):
        source_language = payload[2]

    return translated_text.strip(), source_language


def translate_text(
    text: str,
    source_language: Optional[str] = None,
    target_language: str = "en",
) -> dict:
    """Translate text using Google Translate and return the English output."""
    if not text or not text.strip():
        return {
            "translated_text": text,
            "detected_source_language": source_language or "en",
        }

    sl = (source_language or "auto").lower()
    if sl not in {"auto", "en", "hi", "mr"}:
        sl = "auto"

    params = {
        "client": "gtx",
        "sl": sl,
        "tl": target_language,
        "dt": "t",
        "q": text,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(GOOGLE_TRANSLATE_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise RuntimeError("Translation service is unavailable.") from exc

    translated_text, detected_source_language = _parse_translation_payload(payload)
    if not translated_text:
        raise RuntimeError("No translated text was returned.")

    return {
        "translated_text": translated_text,
        "detected_source_language": detected_source_language,
    }


def translate_to_english_if_needed(
    text: str,
    source_language: Optional[str] = None,
) -> tuple[str, bool]:
    """Translate text to English if it appears to be non-English.

    Returns a tuple of (english_text, was_translated).
    """
    if not text or not text.strip():
        return text, False

    if source_language is not None and source_language.lower() == "en":
        return text, False

    if source_language is None and not contains_non_english_text(text):
        return text, False

    result = translate_text(text, source_language=source_language or "auto")
    return result["translated_text"], True
