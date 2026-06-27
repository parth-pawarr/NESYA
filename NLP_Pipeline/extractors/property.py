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


def extract_property(doc: Doc, raw_text: str) -> dict:
    lower = raw_text.lower()

    # ── Identify property items by keyword scan ───────────────────────────────
    movable_found = [kw for kw in MOVABLE_PROPERTY_KEYWORDS if kw in lower]
    immovable_found = [kw for kw in IMMOVABLE_PROPERTY_KEYWORDS if kw in lower]

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
