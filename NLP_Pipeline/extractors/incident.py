"""
Extractor: INCIDENT
Primary action, action verbs, violence, weapon, threat.
"""
import re
from spacy.tokens import Doc
from utils.lexicon import (
    CRIME_VERBS,
    WEAPON_KEYWORDS,
    THREAT_PHRASES,
    PREMEDITATION_PHRASES,
    CONSENT_NEGATION,
)

# ── Priority-ordered list: (verb, canonical_action)
# Earlier entries win when multiple verbs are present.
# More serious / more specific crimes listed first.
ORDERED_ACTION_MAP = [
    # sexual
    ("raped",          "rape"),
    ("outraged",       "outraging modesty"),
    ("groped",         "outraging modesty"),
    # violent
    ("stabbed",        "stabbing"),
    ("strangled",      "assault"),
    ("shot",           "shooting"),
    # abduction
    ("abducted",       "abduction/kidnapping"),
    ("kidnapped",      "abduction/kidnapping"),
    ("restrained",     "wrongful restraint"),
    ("confined",       "wrongful confinement"),
    # assault-family (check before theft so "assaulted" wins domestic cases)
    ("assaulted",      "assault"),
    ("attacked",       "assault"),
    ("beat",           "assault"),
    ("beaten",         "assault"),
    ("hit",            "assault"),
    ("slapped",        "assault"),
    ("kicked",         "assault"),
    ("punched",        "assault"),
    ("thrashed",       "assault"),
    ("manhandled",     "assault"),
    ("dragged",        "assault"),
    ("injured",        "assault"),
    ("pushed",         "assault"),
    # theft-family
    ("snatched",       "snatching"),
    ("robbed",         "robbery"),
    ("looted",         "robbery"),
    ("grabbed",        "snatching"),
    ("stole",          "theft"),
    ("stolen",         "theft"),
    ("pickpocketed",   "theft"),
    ("pilfered",       "theft"),
    ("misappropriated","misappropriation"),
    ("embezzled",      "embezzlement"),
    # fraud-family
    ("impersonated",   "impersonation/fraud"),
    ("cheated",        "cheating/fraud"),
    ("deceived",       "cheating/fraud"),
    ("duped",          "cheating/fraud"),
    ("defrauded",      "cheating/fraud"),
    ("misled",         "cheating/fraud"),
    ("forged",         "forgery"),
    ("fabricated",     "fabrication"),
    # extortion
    ("extorted",       "extortion"),
    ("blackmailed",    "blackmail"),
    ("demanded",       "extortion/demand"),
    # intimidation (lower priority than assault)
    ("threatened",     "criminal intimidation"),
    ("intimidated",    "criminal intimidation"),
    # harassment
    ("harassed",       "harassment"),
    ("abused",         "abuse"),
    # property
    ("trespassed",     "trespass"),
    ("damaged",        "mischief/property damage"),
    ("vandalized",     "mischief/property damage"),
    ("burnt",          "arson"),
    ("burned",         "arson"),
    ("encroached",     "encroachment"),
]

# ── Violence verbs ────────────────────────────────────────────────────────────
VIOLENCE_VERBS = {
    "assaulted", "attacked", "beat", "beaten", "hit", "slapped",
    "kicked", "punched", "stabbed", "thrashed",
    "manhandled", "dragged", "strangled", "injured", "hurt",
    "wounded", "raped", "groped", "struck", "pushed"
}

# ── Context-sensitive: only violent if NOT in a negating phrase ───────────────
# "shot" is violence only when paired with "gun/fired/bullet", not "screenshot"
CONDITIONAL_VIOLENCE = {
    "shot": r"\b(gun|pistol|bullet|fired|shooting)\b",
    "fired": r"\b(gun|pistol|bullet|shot|fire|weapon)\b",
}


def extract_incident(doc: Doc, raw_text: str) -> dict:
    lower = raw_text.lower()

    # Helper to check if verb matches but is not part of a beat officer role description
    def _is_valid_verb(v: str) -> bool:
        if v == "beat" and re.search(r"\bbeat\s+(?:officer|patrol|constable|policeman|guard)\b", lower):
            return False
        return bool(re.search(r"\b" + re.escape(v) + r"\b", lower))

    # ── Action verbs found in text ────────────────────────────────────────────
    found_verbs = [v for v in CRIME_VERBS if _is_valid_verb(v)]

    # Context-based classification for robbery/snatching narratives
    if re.search(r"\b(held a knife|knife to his throat|knife to her throat|threatened with a knife|robbed|snatched|took his|took her)\b", lower):
        if re.search(r"\b(knife|weapon|throat|robbery|snatched|stolen|took)\b", lower):
            if re.search(r"\b(knife|throat|force|threatened)\b", lower):
                primary_action = "robbery"
            else:
                primary_action = "snatching"
        else:
            primary_action = "robbery"
    else:
        primary_action = "unknown"

    # ── Primary action (priority-ordered) ────────────────────────────────────
    for verb, action in ORDERED_ACTION_MAP:
        if _is_valid_verb(verb):
            primary_action = action
            break

    # ── Violence ──────────────────────────────────────────────────────────────
    violence_involved = any(_is_valid_verb(v) for v in VIOLENCE_VERBS)

    # Conditional violence verbs need context
    for verb, context_pattern in CONDITIONAL_VIOLENCE.items():
        if verb in lower and re.search(context_pattern, lower):
            violence_involved = True
            break

    # Physical-force phrases
    if re.search(r"\b(by force|forcefully|physically|physical assault)\b", lower):
        violence_involved = True

    # ── Weapon ───────────────────────────────────────────────────────────────
    # Sort by length descending so "iron rod" matches before "rod"
    weapon_used = None
    for kw in sorted(WEAPON_KEYWORDS, key=len, reverse=True):
        if re.search(r"\b" + re.escape(kw) + r"\b", lower):
            weapon_used = kw
            break

    # Exclude "chain" when it's the gold chain being stolen, not a weapon
    if weapon_used == "chain" and "gold chain" in lower:
        # look for another weapon
        weapon_used = None
        for kw in WEAPON_KEYWORDS:
            if kw != "chain" and kw in lower:
                weapon_used = kw
                break

    # ── Threat ───────────────────────────────────────────────────────────────
    threat_made = any(re.search(r"\b" + re.escape(phrase) + r"\b", lower) for phrase in THREAT_PHRASES)

    # ── Premeditation ─────────────────────────────────────────────────────────
    premeditation = any(phrase in lower for phrase in PREMEDITATION_PHRASES)

    # ── Consent ──────────────────────────────────────────────────────────────
    if any(phrase in lower for phrase in CONSENT_NEGATION):
        consent_given = False
    else:
        consent_given = "unknown"

    return {
        "primary_action":  primary_action,
        "action_verbs":    found_verbs,
        "violence_involved": violence_involved,
        "weapon_used":     weapon_used,
        "threat_made":     threat_made,
        "_premeditation":  premeditation,
        "_consent_given":  consent_given,
    }
