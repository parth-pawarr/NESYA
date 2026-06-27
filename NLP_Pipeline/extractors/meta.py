"""
Extractor: MISSING FIELDS + CONFIDENCE SCORE
Identifies legally important gaps and scores extraction quality.
"""
from spacy.tokens import Doc

# All fields we check for completeness
ALL_CHECKABLE = {
    "accused_identity",
    "exact_location",
    "date_of_incident",
    "time_of_incident",
    "witness_details",
    "property_value",
    "medical_report",
    "prior_relationship",
    "motive",
    "evidence_available",
}

# Phrases that suggest evidence
EVIDENCE_PHRASES = [
    "cctv", "camera", "footage", "video", "recorded", "screenshot",
    "photograph", "photo", "document", "proof", "receipt",
]

# Phrases that mention medical treatment
MEDICAL_PHRASES = [
    "hospital", "doctor", "medical", "injury report", "mlc",
    "medico-legal", "treatment", "admitted",
]

# Motive indicator phrases
MOTIVE_PHRASES = [
    "motive", "reason", "due to", "because", "dispute over",
    "land dispute", "property dispute", "revenge", "jealousy",
    "enmity", "old enmity",
]


def compute_missing_and_confidence(
    result: dict,
    raw_text: str,
) -> dict:
    lower = raw_text.lower()
    missing = []
    confidence_deductions = []
    ambiguous = []

    # 1. Accused identity
    if result["accused"] in {"unknown person(s)", "not identified in narrative"}:
        missing.append("accused_identity")
        confidence_deductions.append(0.15)

    # 2. Exact location
    if result["location"] is None:
        missing.append("exact_location")
        confidence_deductions.append(0.10)

    # 3. Date of incident
    if result["date"] is None:
        missing.append("date_of_incident")
        confidence_deductions.append(0.10)

    # 4. Time of incident
    if result["time"] is None:
        missing.append("time_of_incident")
        confidence_deductions.append(0.05)

    # 5. Witness details
    if not result["witnesses"]:
        missing.append("witness_details")
        confidence_deductions.append(0.05)

    # 6. Property value / financial amount
    if result["property_involved"] and result["financial_amount"] is None:
        missing.append("property_value")
        confidence_deductions.append(0.08)

    # 7. Medical report (if violence involved)
    if result["violence_involved"] and not any(p in lower for p in MEDICAL_PHRASES):
        missing.append("medical_report")
        confidence_deductions.append(0.05)

    # 8. Prior relationship
    if result["accused_known_to_victim"] == "unknown":
        missing.append("prior_relationship")
        confidence_deductions.append(0.05)

    # 9. Motive
    if not any(p in lower for p in MOTIVE_PHRASES):
        missing.append("motive")
        confidence_deductions.append(0.05)

    # 10. Evidence
    if not any(p in lower for p in EVIDENCE_PHRASES):
        missing.append("evidence_available")
        confidence_deductions.append(0.05)

    # ── Ambiguous phrases ─────────────────────────────────────────────────────
    AMBIGUOUS_TRIGGERS = [
        ("around", "approximate time/location phrasing: 'around'"),
        ("some time", "vague temporal reference: 'some time'"),
        ("certain persons", "vague accused description: 'certain persons'"),
        ("unknown persons", "accused unidentified: 'unknown persons'"),
        ("or so", "approximate quantity: 'or so'"),
        ("i think", "uncertain recall: 'i think'"),
        ("believe", "uncertain recall: 'believe'"),
        ("maybe", "uncertain: 'maybe'"),
    ]
    for trigger, description in AMBIGUOUS_TRIGGERS:
        if trigger in lower:
            ambiguous.append(description)

    # ── Confidence score ──────────────────────────────────────────────────────
    base = 1.0
    total_deduction = min(sum(confidence_deductions), 0.70)  # cap deductions
    confidence = round(base - total_deduction, 2)

    return {
        "missing_fields": missing,
        "extraction_confidence": confidence,
        "ambiguous_parts": ambiguous,
    }
