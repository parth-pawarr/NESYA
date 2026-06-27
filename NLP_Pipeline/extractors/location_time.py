"""
Extractor: LOCATION & TIME
Place, location type, date, time, time-of-day.
"""
import re
from spacy.tokens import Doc
from utils.lexicon import (
    PUBLIC_LOCATION_KEYWORDS,
    PRIVATE_LOCATION_KEYWORDS,
    RESIDENTIAL_LOCATION_KEYWORDS,
    WORKPLACE_LOCATION_KEYWORDS,
    ONLINE_LOCATION_KEYWORDS,
    TIME_OF_DAY_KEYWORDS,
    TIME_OF_DAY_MAP,
)
from utils.preprocessing import extract_date, extract_time, extract_location


def _classify_location_type(lower: str) -> str:
    if any(kw in lower for kw in ONLINE_LOCATION_KEYWORDS):
        return "online"
    if any(kw in lower for kw in WORKPLACE_LOCATION_KEYWORDS):
        return "workplace"
    if any(kw in lower for kw in RESIDENTIAL_LOCATION_KEYWORDS):
        return "residential"
    if any(kw in lower for kw in PUBLIC_LOCATION_KEYWORDS):
        return "public"
    if any(kw in lower for kw in PRIVATE_LOCATION_KEYWORDS):
        return "private"
    return "unknown"


def _infer_time_of_day(time_str: str | None, lower: str) -> str:
    # 1. Try parsing hour from extracted time string first (most reliable)
    if time_str:
        m = re.match(r"(\d{1,2})(?::(\d{2}))?", time_str)
        if m:
            hour = int(m.group(1))
            is_pm = bool(re.search(r"\bpm\b", time_str, re.IGNORECASE))
            is_am = bool(re.search(r"\bam\b", time_str, re.IGNORECASE))
            if is_pm and hour != 12:
                hour += 12
            if is_am and hour == 12:
                hour = 0
            for tod, hours in TIME_OF_DAY_MAP.items():
                if hour in hours:
                    return tod

    # 2. Keyword matching on full text
    for tod, keywords in TIME_OF_DAY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return tod

    # 3. Regex for bare "X PM / X AM" in text without time_str
    m = re.search(r"\b(\d{1,2})\s*(pm|am)\b", lower)
    if m:
        hour = int(m.group(1))
        meridiem = m.group(2)
        if meridiem == "pm" and hour != 12:
            hour += 12
        if meridiem == "am" and hour == 12:
            hour = 0
        for tod, hours in TIME_OF_DAY_MAP.items():
            if hour in hours:
                return tod

    return "unknown"


def extract_location_time(doc: Doc, raw_text: str) -> dict:
    lower = raw_text.lower()

    location = extract_location(raw_text)
    location_type = _classify_location_type(lower)

    date = extract_date(raw_text)
    time = extract_time(raw_text)
    time_of_day = _infer_time_of_day(time, lower)

    return {
        "location":      location,
        "location_type": location_type,
        "date":          date,
        "time":          time,
        "time_of_day":   time_of_day,
    }
