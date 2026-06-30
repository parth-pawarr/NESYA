"""
Question Generator — maps missing NLP fields to natural, conversational questions.
Generates at most 2 questions per turn, prioritising the most legally critical fields.
"""

# ── Field priority (lower number = asked first) ───────────────────────────────
FIELD_PRIORITY = {
    "exact_location":    1,
    "date_of_incident":  2,
    "time_of_incident":  3,
    "accused_identity":  4,
    "prior_relationship":5,
    "property_value":    6,
    "medical_report":    7,
    "witness_details":   8,
    "motive":            9,
    "evidence_available":10,
}

# ── Friendly one-line labels for each field ───────────────────────────────────
FIELD_LABELS = {
    "exact_location":     "Incident Location",
    "date_of_incident":   "Date of Incident",
    "time_of_incident":   "Time of Incident",
    "accused_identity":   "Accused / Suspect Details",
    "prior_relationship": "Relationship to Accused",
    "property_value":     "Value of Stolen/Damaged Property",
    "medical_report":     "Medical Treatment",
    "witness_details":    "Witness Information",
    "motive":             "Motive / Reason",
    "evidence_available": "Available Evidence",
}

# ── Single clear question per missing field ───────────────────────────────────
FIELD_QUESTIONS = {
    "exact_location": (
        "📍 **Where did the incident take place?** "
        "Please provide the specific address, landmark, or location name."
    ),
    "date_of_incident": (
        "📅 **On what date did the incident occur?** "
        "You can say something like \"15th June 2024\" or \"last Monday\"."
    ),
    "time_of_incident": (
        "🕐 **Approximately what time did it happen?** "
        "Even a rough estimate like \"around 9 PM\" is helpful."
    ),
    "accused_identity": (
        "👤 **Can you describe the accused/suspect?** "
        "If known, share their name. If unknown, describe their appearance, vehicle, or any identifying details."
    ),
    "prior_relationship": (
        "🤝 **What was your relationship with the accused?** "
        "For example: stranger, neighbour, colleague, relative, or unknown person."
    ),
    "property_value": (
        "💰 **What is the approximate value of the stolen or damaged property?** "
        "Please mention the amount in rupees."
    ),
    "medical_report": (
        "🏥 **Did you seek medical treatment after the incident?** "
        "If yes, please mention the hospital name and nature of injuries."
    ),
    "witness_details": (
        "👥 **Were there any witnesses present?** "
        "If yes, please share their names and contact details if available."
    ),
    "motive": (
        "❓ **Do you know the reason or motive behind this incident?** "
        "Was there any prior dispute, financial issue, or personal conflict?"
    ),
    "evidence_available": (
        "📷 **Is there any evidence available?** "
        "For example: CCTV footage, photographs, messages, documents, or receipts."
    ),
}

# ── Clarification questions from the rule engine mapped to user-friendly text ──
RULE_QUESTION_MAP = {
    "Did you hand over the property voluntarily": (
        "🤔 **Was the property taken without your consent?** "
        "Please confirm — did you hand over the item(s) voluntarily, or were they taken by force/without permission?"
    ),
    "What type of property was involved": (
        "📦 **What property was involved in the incident?** "
        "Please describe the items (e.g., mobile phone, cash, jewellery, vehicle)."
    ),
}


def get_questions_for_missing(
    missing_fields: list[str],
    asked_fields: set,
    rule_clarifications: list[dict],
    max_questions: int = 2
) -> list[str]:
    """
    Return up to `max_questions` questions for the highest-priority missing fields
    that haven't been asked yet.

    Parameters
    ----------
    missing_fields      : list from NLP MISSING_INFORMATION
    asked_fields        : set of field names already asked in this session
    rule_clarifications : list of {section_id, missing_field, question, priority} dicts
    max_questions       : maximum questions to return (default 2)

    Returns
    -------
    list of question strings (markdown-formatted)
    """
    questions = []
    fields_asked_this_turn = set()

    # First, add rule-engine clarification questions (highest authority)
    for cq in rule_clarifications:
        if len(questions) >= max_questions:
            break
        raw_q = cq.get("question", "")
        # Map to friendly version if possible
        friendly = None
        for key, val in RULE_QUESTION_MAP.items():
            if key.lower() in raw_q.lower():
                friendly = val
                break
        field_key = cq.get("missing_field", raw_q[:30])
        if field_key not in asked_fields:
            questions.append(friendly or raw_q)
            fields_asked_this_turn.add(field_key)

    # Then, add questions for NLP missing fields by priority
    sorted_missing = sorted(
        missing_fields,
        key=lambda f: FIELD_PRIORITY.get(f, 99)
    )
    for field in sorted_missing:
        if len(questions) >= max_questions:
            break
        if field in asked_fields or field in fields_asked_this_turn:
            continue
        if field in FIELD_QUESTIONS:
            questions.append(FIELD_QUESTIONS[field])
            fields_asked_this_turn.add(field)

    return questions


def get_fields_asked_this_turn(
    missing_fields: list[str],
    asked_fields: set,
    rule_clarifications: list[dict],
    max_questions: int = 2
) -> set:
    """Return the set of field keys that would be asked given the same params."""
    asked_this_turn = set()

    for cq in rule_clarifications:
        if len(asked_this_turn) >= max_questions:
            break
        field_key = cq.get("missing_field", "")
        if field_key not in asked_fields:
            asked_this_turn.add(field_key)

    sorted_missing = sorted(missing_fields, key=lambda f: FIELD_PRIORITY.get(f, 99))
    for field in sorted_missing:
        if len(asked_this_turn) >= max_questions:
            break
        if field not in asked_fields and field not in asked_this_turn:
            asked_this_turn.add(field)

    return asked_this_turn


def build_suggested_replies(missing_fields: list[str], primary_action: str) -> list[str]:
    """
    Generate quick-reply suggestion chips relevant to the current context.
    """
    suggestions = []

    if "exact_location" in missing_fields:
        suggestions += ["Near Railway Station", "At my home", "On the main road"]
    elif "date_of_incident" in missing_fields:
        suggestions += ["Yesterday", "Last week", "Today"]
    elif "time_of_incident" in missing_fields:
        suggestions += ["Around 8 PM", "In the morning", "Late at night"]
    elif "accused_identity" in missing_fields:
        suggestions += ["Unknown person", "My neighbour", "A stranger on a bike"]
    elif "witness_details" in missing_fields:
        suggestions += ["No witnesses", "A bystander saw it", "My family was present"]
    elif "evidence_available" in missing_fields:
        suggestions += ["No evidence", "I have CCTV footage", "I have screenshots"]

    # Clip to 4 suggestions max
    return suggestions[:4]
