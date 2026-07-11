"""
Extractor: PEOPLE
Extracts victim, accused, witnesses, and third-party mentions.
"""
import re
from spacy.tokens import Doc
from utils.lexicon import KNOWN_ACCUSED_PHRASES, UNKNOWN_ACCUSED_PHRASES


# ── Patterns that introduce the complainant/victim ────────────────────────────
VICTIM_PATTERNS = [
    r"(?:i am|my name is|[cC]omplainant is|[vV]ictim is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    r"^I,?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",   # "I, Sunita Devi"
    r"\b[cC]omplainant\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",  # "Complainant Mohammad Salim"
    r"\b[cC]omplainant\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,",  # "Complainant Tariq Ali, auto driver, states..."
    r"\b[cC]omplainant\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+states\b",
]

# ── Patterns that introduce the accused ──────────────────────────────────────
ACCUSED_PATTERNS = [
    r"(?:[aA]ccused|[sS]uspect|[cC]ulprit|[aA]ssailant|[oO]ffender)(?:s)?(?:\s+named?)?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)",
    r"(?:against my|against his|against her|against their)\s+(?:[hH]usband|[wW]ife|[bB]rother|[sS]ister|[fF]ather|[mM]other|[nN]eighbour|[nN]eighbor|[cC]olleague|[fF]riend|[rR]elative|[lL]andlord|[tT]enant)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)",
    r"against\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:and|who)",
    r"(?:by one|by a man named?|by|from)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})(?:\s+who|\.|,)",
    r"(?:[nN]eighbour|[nN]eighbor|[cC]olleague|[fF]riend|[rR]elative|[lL]andlord|[tT]enant)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:arrived|came|struck|attacked|did|stole|snatched|demanded|threatened)",
]

# ── Patterns for witnesses ────────────────────────────────────────────────────
WITNESS_PATTERNS = [
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+were present\b",
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+witnessed\b",
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+saw\b",
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+was present\b",
    r"\b[wW]itness(?:ed)? by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    r"\bin the presence of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    r"\b[wW]itness(?:es)?(?:\s+(?:namely|named|called))?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)\b",
    r"\b(?:[tT]here were|[tT]here was)(?:\s+(?:two|three|several|a|an))?\s+[wW]itness(?:es)?(?:\s+(?:namely|named|called))?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)\b",
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?\s+(?:a bystander|bystander)\b",
    r"\b[bB]ystander[,.]?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    r"\b[wW]itness(?:es)?\s+(?:included|included a|were)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)",
    r"\bseen by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:later\s+)?gave(?:\s+his|\s+her|\s+their)?\s+statement\s+to\s+the\s+police\b",
]


NAME_STOPWORDS = {
    "a", "an", "the", "who", "which", "that", "there", "was", "were",
    "is", "are", "be", "been", "being", "later", "gave", "saw",
    "witness", "witnessed", "present", "statement", "police", "incident",
    "whole", "he", "she", "his", "her", "their", "them", "it", "this",
    "these", "those", "of", "to", "for", "from", "by", "with", "namely",
    "two", "three", "four", "five", "several", "some", "many", "bystander"
}


def _find_names(text: str, patterns: list) -> list:
    found = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.MULTILINE):
            name_group = m.group(1).strip()
            # Split multiple names separated by 'and', 'or', ',', '&'
            raw_names = re.split(r'\band\b|\bor\b|,|&', name_group, flags=re.IGNORECASE)
            for raw_name in raw_names:
                name = raw_name.strip()
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
    return list(dict.fromkeys(found))


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
