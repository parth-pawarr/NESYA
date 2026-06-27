"""
Extractor: PROPERTY
Items, type (movable/immovable/both/none), financial loss, amount.
"""
import re
from spacy.tokens import Doc
from utils.lexicon import (
    MOVABLE_PROPERTY_KEYWORDS,
    IMMOVABLE_PROPERTY_KEYWORDS,
    FINANCIAL_KEYWORDS,
)
from utils.preprocessing import extract_financial_amount


def _is_used_as_location_or_residence(keyword: str, text: str) -> bool:
    """Checks if a property keyword is used strictly as a location or residency context."""
    patterns = [
        rf"\b(?:resides?|lives?|stays?|stands?|standing|outside|inside|near|at|behind|opposite|in front of)\s+(?:his\s+|her\s+|my\s+|the\s+|a\s+|our\s+|their\s+)?(?:[a-z]{2,15}\s+)*\b{re.escape(keyword)}\b",
        rf"\b(?:in|at|near|of)\s+(?:the\s+|a\s+|my\s+|his\s+|her\s+)?\b{re.escape(keyword)}\b"
    ]
    for pat in patterns:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False


def extract_property(doc: Doc, raw_text: str) -> dict:
    lower = raw_text.lower()

    # ── Identify property items by keyword scan ───────────────────────────────
    movable_found = []
    for kw in MOVABLE_PROPERTY_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", lower):
            # Vehicles are rarely false positive locations unless prefixed heavily
            if kw in ["car", "vehicle", "scooter", "motorcycle", "bike"] or not _is_used_as_location_or_residence(kw, lower):
                movable_found.append(kw)

    immovable_found = []
    for kw in IMMOVABLE_PROPERTY_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", lower):
            if not _is_used_as_location_or_residence(kw, lower):
                immovable_found.append(kw)

    property_items = list(dict.fromkeys(movable_found + immovable_found))

    # ── Determine type ────────────────────────────────────────────────────────
    if movable_found and immovable_found:
        property_type = "both"
    elif movable_found:
        property_type = "movable"
    elif immovable_found:
        property_type = "immovable"
    else:
        property_type = "none"

    property_involved = property_type != "none"

    # ── Financial loss ────────────────────────────────────────────────────────
    financial_loss = any(kw in lower for kw in FINANCIAL_KEYWORDS)
    financial_amount = extract_financial_amount(raw_text)

    # If we got an amount, financial_loss is definitely true
    if financial_amount:
        financial_loss = True

    return {
        "property_involved": property_involved,
        "property_items": property_items,
        "property_type": property_type,
        "financial_loss": financial_loss,
        "financial_amount": financial_amount,
    }
