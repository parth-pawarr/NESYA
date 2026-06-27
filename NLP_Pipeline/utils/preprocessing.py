"""
Preprocessing utilities for FIR narrative text.
"""
import re
import spacy


def build_nlp():
    """Build a spaCy blank English pipeline with a sentencizer."""
    nlp = spacy.blank("en")
    nlp.add_pipe("sentencizer")
    return nlp


def normalize(text: str) -> str:
    """Lowercase, collapse whitespace, strip leading/trailing space."""
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_financial_amount(text: str) -> str | None:
    """
    Pull the first monetary amount from text.
    Handles patterns like:
      Rs. 50,000 / Rs 1.5 lakh / INR 2 crore / ₹10000
    """
    patterns = [
        r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:lakhs?|crores?|thousands?)?",
        r"([\d,]+(?:\.\d+)?)\s*(?:lakhs?|crores?)\s*(?:rupees?)?",
        r"(?:rupees?|amount of)\s*([\d,]+(?:\.\d+)?)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(0).strip()
            # normalise spacing
            raw = re.sub(r"\s+", " ", raw)
            return raw
    return None


def extract_date(text: str) -> str | None:
    """Extract a date string from the narrative."""
    patterns = [
        # DD/MM/YYYY  or  DD-MM-YYYY
        r"\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b",
        # DD Month YYYY  /  Month DD, YYYY
        r"\b(\d{1,2}\s+(?:january|february|march|april|may|june|july|"
        r"august|september|october|november|december)\s+\d{4})\b",
        r"\b((?:january|february|march|april|may|june|july|august|"
        r"september|october|november|december)\s+\d{1,2},?\s+\d{4})\b",
        # "on the night of 15th March"
        r"\b(\d{1,2}(?:st|nd|rd|th)\s+(?:january|february|march|april|"
        r"may|june|july|august|september|october|november|december)"
        r"(?:\s+\d{4})?)\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def extract_time(text: str) -> str | None:
    """Extract a time string from the narrative."""
    patterns = [
        r"\b(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.?|p\.m\.?))\b",
        r"\b(\d{1,2}\s*(?:am|pm|a\.m\.?|p\.m\.?))\b",
        r"\baround\s+(\d{1,2}(?::\d{2})?)\b",
        r"\bat\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def extract_location(text: str) -> str | None:
    """
    Heuristic extraction of location from phrases like
    'near X', 'at X', 'in front of X', 'on X road'.
    Returns the extracted snippet or None.
    """
    patterns = [
        r"(?:near|at|in front of|outside|behind|inside|opposite)\s+([A-Z][^,.;]{3,40})",
        r"(?:on|at)\s+([A-Z][a-zA-Z\s]+(?:road|street|lane|nagar|colony|chowk|bazaar|marg|highway))",
        r"(?:in|at)\s+([A-Z][a-zA-Z\s]{2,30}(?:village|town|city|district|police station|area))",
    ]
    for pat in patterns:
        m = re.search(pat, text)   # case-sensitive for proper nouns
        if m:
            return m.group(1).strip()
    return None
