"""
Legal NLP Lexicon for Indian FIR Narratives
All keyword lists used across extractors.
"""

# ── Crime-related action verbs ────────────────────────────────────────────────
CRIME_VERBS = {
    # theft / robbery
    "snatched", "stole", "stolen", "robbed", "looted", "grabbed",
    "pickpocketed", "pilfered", "misappropriated", "embezzled",
    # assault / violence
    "assaulted", "attacked", "beat", "beaten", "hit", "slapped",
    "kicked", "punched", "stabbed", "shot", "fired", "pushed",
    "thrashed", "manhandled", "dragged", "strangled", "injured",
    "hurt", "wounded",
    # harassment / threat
    "threatened", "intimidated", "abused", "harassed", "molested",
    "blackmailed", "extorted", "demanded",
    # fraud / deception
    "cheated", "deceived", "duped", "forged", "fabricated",
    "impersonated", "defrauded", "misled",
    # trespass / property
    "trespassed", "broke", "broken", "damaged", "destroyed",
    "vandalized", "burnt", "burned", "encroached",
    # movement after crime
    "fled", "escaped", "absconded", "ran", "ran away",
    # forceful entry / abduction
    "abducted", "kidnapped", "forcibly", "forced", "restrained",
    "confined", "detained", "blocked", "intercepted",
    # sexual offences
    "raped", "outraged", "touched", "groped", "attempted",
}

# ── Weapon / instrument keywords ─────────────────────────────────────────────
WEAPON_KEYWORDS = {
    "knife", "knives", "gun", "pistol", "revolver", "rifle",
    "iron rod", "rod", "stick", "lathi", "bat", "sword", "blade",
    "bottle", "acid", "petrol", "kerosene", "stone", "stones",
    "axe", "hammer", "scissors", "wire", "rope", "chain",
    "screwdriver", "pipe",
}

# ── Threat indicator phrases ──────────────────────────────────────────────────
THREAT_PHRASES = [
    "threatened", "will kill", "will harm", "dire consequences",
    "taught a lesson", "see consequences", "won't spare",
    "regret", "face the music", "life threat", "threatening calls",
    "sent messages threatening", "demanded", "blackmailed",
]

# ── Property / movable item keywords ─────────────────────────────────────────
MOVABLE_PROPERTY_KEYWORDS = {
    "mobile", "phone", "smartphone", "laptop", "computer", "tablet",
    "cash", "money", "wallet", "purse", "bag", "handbag",
    "gold", "chain", "necklace", "ring", "bangles", "jewellery",
    "jewelry", "watch", "bicycle", "bike", "motorcycle", "scooter",
    "car", "vehicle", "documents", "passport", "cheque", "cheques",
    "cheque book", "atm", "card", "debit card", "credit card",
    "earrings", "bracelet", "clothes",
}

IMMOVABLE_PROPERTY_KEYWORDS = {
    "land", "plot", "house", "property", "flat", "apartment",
    "shop", "building", "godown", "warehouse", "field", "farm",
}

# ── Financial loss indicators ─────────────────────────────────────────────────
FINANCIAL_KEYWORDS = {
    "rupees", "rs.", "rs ", "inr", "lakhs", "lakh", "crore",
    "thousand", "amount", "sum", "loss", "money", "cash",
    "transferred", "withdrew", "deducted",
}

# ── Location type classifiers ─────────────────────────────────────────────────
PUBLIC_LOCATION_KEYWORDS = {
    "road", "street", "highway", "market", "bus stand", "railway",
    "station", "park", "garden", "signal", "crossing", "junction",
    "bridge", "public place", "bus stop", "auto stand", "footpath",
    "lane", "area", "colony", "chowk", "bazaar", "walking",
}

PRIVATE_LOCATION_KEYWORDS = {
    "house", "home", "flat", "apartment", "room", "office",
    "shop", "godown", "vehicle", "car", "auto", "cab",
}

RESIDENTIAL_LOCATION_KEYWORDS = {
    "house", "home", "flat", "apartment", "residential", "building",
    "colony", "society", "quarters",
}

WORKPLACE_LOCATION_KEYWORDS = {
    "office", "shop", "factory", "workplace", "godown", "bank",
    "school", "college", "hospital",
}

ONLINE_LOCATION_KEYWORDS = {
    "online", "internet", "website", "whatsapp", "facebook",
    "instagram", "social media", "email", "phone call", "otp",
    "upi", "neft", "rtgs",
}

# ── Time of day ───────────────────────────────────────────────────────────────
TIME_OF_DAY_MAP = {
    "morning":   range(5, 12),
    "afternoon": range(12, 17),
    "evening":   range(17, 21),
    "night":     list(range(21, 24)) + list(range(0, 5)),
}

# "am"/"pm" alone are too ambiguous for keyword matching;
# hour-based logic in _infer_time_of_day handles those cases.
TIME_OF_DAY_KEYWORDS = {
    "morning":   ["morning", "dawn", "sunrise"],
    "afternoon": ["afternoon", "noon", "midday"],
    "evening":   ["evening", "dusk", "sunset"],
    "night":     ["night", "midnight", "late night", "dark"],
}

# ── Premeditation indicators ──────────────────────────────────────────────────
PREMEDITATION_PHRASES = [
    "planned", "premeditated", "conspired", "hatched", "deliberate",
    "previously", "prior", "had been", "waiting for", "followed",
    "laid in wait", "trap", "lured", "called", "invited",
]

# ── Consent-negation indicators ───────────────────────────────────────────────
CONSENT_NEGATION = [
    "without consent", "forcibly", "against will", "unwillingly",
    "against my will", "without permission", "non-consensual",
    "by force", "forcefully",
]

# ── Accused-known indicators ──────────────────────────────────────────────────
KNOWN_ACCUSED_PHRASES = [
    "known to", "neighbour", "neighbor", "friend", "relative",
    "husband", "wife", "employer", "employee", "colleague",
    "acquaintance", "former", "ex-", "known person",
]

UNKNOWN_ACCUSED_PHRASES = [
    "unknown", "unidentified", "masked", "disguised",
    "stranger", "unknown persons",
]
