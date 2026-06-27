"""
Extractor: PEOPLE
Extracts victim, accused, witnesses, and third-party mentions.
"""
import re
from spacy.tokens import Doc
from utils.lexicon import KNOWN_ACCUSED_PHRASES, UNKNOWN_ACCUSED_PHRASES


# ── Patterns that introduce the complainant/victim ────────────────────────────
VICTIM_PATTERNS = [
    r"(?:i am|my name is|complainant is|victim is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)",
    r"^I,?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)",   # "I, Sunita Devi"
]

# ── Patterns that introduce the accused ──────────────────────────────────────
ACCUSED_PATTERNS = [
    r"(?:accused|suspect|culprit|assailant|offender)(?:s)?(?:\s+named?)?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)",
    r"(?:against my (?:husband|wife|brother|sister|father|mother))\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)",
    r"against\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:and|who)",
    r"(?:by one|by a man named?|by)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})(?:\s+who|\.|,)",
]

# ── Patterns for witnesses ────────────────────────────────────────────────────
WITNESS_PATTERNS = [
    r"\b([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)\s+witnessed\b",
    r"\b([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)\s+saw\b",
    r"\b([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)\s+was present\b",
    r"\bwitness(?:ed)? by\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)*)",
    r"\bin the presence of\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)*)",
    r"\b([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+),?\s+(?:a bystander|bystander)\b",
    r"\bbystander[,.]?\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)",
    r"\b(?:there was|there were)\s+(?:a|an)\s+witness(?:\s+(?:named|called))?\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)",
    r"\bwitness(?:es)?\s+(?:included|included a|were)\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)",
    r"\bseen by\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)",
    r"\b([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)+)\s+(?:later\s+)?gave(?:\s+his|\s+her|\s+their)?\s+statement\s+to\s+the\s+police\b",
]


NAME_STOPWORDS = {
    "a", "an", "the", "who", "which", "that", "there", "was", "were",
    "is", "are", "be", "been", "being", "later", "gave", "saw",
    "witness", "witnessed", "present", "statement", "police", "incident",
    "whole", "he", "she", "his", "her", "their", "them", "it", "this",
    "these", "those", "and", "of", "to", "for", "from", "by", "with",
}


def _find_names(text: str, patterns: list) -> list:
    found = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.MULTILINE | re.IGNORECASE):
            name = m.group(1).strip()
            name = re.sub(r"\s+", " ", name)
            name = re.sub(r"[^A-Za-z\s.-]", "", name).strip()
            tokens = [tok for tok in name.split() if tok]
            if not tokens:
                continue

            filtered_tokens = []
            for tok in tokens:
                if tok.lower() in NAME_STOPWORDS:
                    break
                filtered_tokens.append(tok)

            if not filtered_tokens:
                continue

            name = " ".join(filtered_tokens)
            if len(name) > 2 and name.lower() not in {"the", "a", "an"}:
                found.append(name)
    return list(dict.fromkeys(found))    # deduplicate, preserve order


def extract_people(doc: Doc, raw_text: str) -> dict:
    text = raw_text          # keep original case for name patterns
    lower = raw_text.lower()

    # ── Victim ───────────────────────────────────────────────────────────────
    victim_names = _find_names(text, VICTIM_PATTERNS)
    victim = victim_names[0] if victim_names else "complainant"

    # ── Accused ──────────────────────────────────────────────────────────────
    accused_names = _find_names(text, ACCUSED_PATTERNS)

    if accused_names:
        accused = accused_names[0]
    elif any(kw in lower for kw in UNKNOWN_ACCUSED_PHRASES):
        accused = "unknown person(s)"
    else:
        accused = "not identified in narrative"

    # ── Witnesses ─────────────────────────────────────────────────────────────
    witnesses = _find_names(text, WITNESS_PATTERNS)

    # ── Third parties (names not already captured) ────────────────────────────
    already_captured = set(victim_names + accused_names + witnesses)
    third_parties = []
    for ent in doc.ents:
        if ent.label_ == "PERSON" and ent.text not in already_captured:
            third_parties.append(ent.text)

    # ── Accused known to victim ───────────────────────────────────────────────
    if any(phrase in lower for phrase in KNOWN_ACCUSED_PHRASES):
        accused_known = True
    elif any(phrase in lower for phrase in UNKNOWN_ACCUSED_PHRASES):
        accused_known = False
    elif accused_names:
        accused_known = True
    else:
        accused_known = "unknown"

    return {
        "victim":       victim,
        "accused":      accused,
        "witnesses":    witnesses,
        "third_parties": list(dict.fromkeys(third_parties)),
        "_accused_known_to_victim": accused_known,
    }
