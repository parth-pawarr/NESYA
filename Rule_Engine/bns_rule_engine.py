from typing import Any
from dataclasses import dataclass

# ── Constants ────────────────────────────────────────────────────────────────

TAKING_VERBS = [
    "stole", "stolen", "snatched", "snatch", "took", "take",
    "removed", "missing", "picked", "lifted", "grabbed", "carried away",
    "forcibly"
]
HURT_VERBS = [
    "hit", "beat", "slapped", "slap", "punched", "punch",
    "kicked", "kick", "pushed", "push", "attacked", "attack",
    "struck", "assault", "assaulted", "thrashed", "manhandled"
]
THREAT_VERBS = [
    "threatened", "threat", "warned", "intimidated",
    "coerced", "blackmailed", "extort"
]
FRAUD_VERBS = [
    "cheated", "cheat", "defrauded", "fraud", "misled",
    "tricked", "deceived", "lied", "false promise", "promised",
    "impersonated", "impersonate", "duped", "forged", "fake", "scam",
    "otp", "link", "debited", "transferred", "invested", "withdrawn",
    "claimed", "claiming", "pose", "posing", "scheme", "fabricated"
]
GRIEVOUS_VERBS = [
    "stabbed", "stab", "shot", "chopped", "acid",
    "fractured", "blinded", "disfigured"
]


# ── FactsAccessor ─────────────────────────────────────────────────────────────

class FactsAccessor:
    """
    Wraps a nested JSON object produced by the NLP pipeline and provides
    flat accessor methods to retrieve key legal facts.
    """

    def __init__(self, data: dict[str, Any]) -> None:
        """
        Initializes the FactsAccessor with the nested NLP JSON output.

        Parameters
        ----------
        data : dict[str, Any]
            The nested dictionary containing extracted facts.
        """
        self._data: dict[str, Any] = data

    # ── PEOPLE ───────────────────────────────────────────────────────────────

    def victim(self) -> str:
        """Gets the name or identifier of the victim."""
        return str(self._data.get("PEOPLE", {}).get("victim", ""))

    def accused(self) -> str:
        """Gets the name, description, or status of the accused."""
        return str(self._data.get("PEOPLE", {}).get("accused", ""))

    def witnesses(self) -> list[str]:
        """Gets the list of witnesses."""
        witnesses_data = self._data.get("PEOPLE", {}).get("witnesses", [])
        return [str(w) for w in witnesses_data]

    def has_witnesses(self) -> bool:
        """Checks if there are any witnesses present."""
        return len(self.witnesses()) > 0

    # ── INCIDENT ─────────────────────────────────────────────────────────────

    def primary_action(self) -> str:
        """Gets the primary action of the incident."""
        return str(self._data.get("INCIDENT", {}).get("primary_action", ""))

    def action_verbs(self) -> list[str]:
        """Gets the action verbs associated with the incident."""
        verbs_data = self._data.get("INCIDENT", {}).get("action_verbs", [])
        return [str(v) for v in verbs_data]

    def violence_involved(self) -> bool:
        """Checks if violence was involved in the incident."""
        return bool(self._data.get("INCIDENT", {}).get("violence_involved", False))

    def weapon_used(self) -> str | None:
        """Gets the weapon used, if any."""
        val = self._data.get("INCIDENT", {}).get("weapon_used")
        return str(val) if val is not None else None

    def threat_made(self) -> bool:
        """Checks if a threat was made during the incident."""
        return bool(self._data.get("INCIDENT", {}).get("threat_made", False))

    def has_verb(self, verb_list: list[str]) -> bool:
        """Performs a case-insensitive substring match in both directions."""
        action_verbs = self.action_verbs()
        for v in verb_list:
            v_lower = v.lower()
            for av in action_verbs:
                av_lower = av.lower()
                if v_lower in av_lower or av_lower in v_lower:
                    return True
        return False

    # ── PROPERTY ─────────────────────────────────────────────────────────────

    def property_involved(self) -> bool:
        """Checks if property was involved in the incident."""
        return bool(self._data.get("PROPERTY", {}).get("property_involved", False))

    def property_items(self) -> list[str]:
        """Gets the list of property items involved."""
        items_data = self._data.get("PROPERTY", {}).get("property_items", [])
        return [str(item) for item in items_data]

    def property_type(self) -> str:
        """Gets the type of property (movable, immovable, etc.)."""
        return str(self._data.get("PROPERTY", {}).get("property_type", ""))

    def is_movable(self) -> bool:
        """Checks if the property involved is movable."""
        return self.property_type().lower() == "movable"

    def financial_loss(self) -> bool:
        """Checks if there was a financial loss."""
        return bool(self._data.get("PROPERTY", {}).get("financial_loss", False))

    def financial_amount(self) -> str | None:
        """Gets the financial amount involved, if any."""
        val = self._data.get("PROPERTY", {}).get("financial_amount")
        return str(val) if val is not None else None

    # ── LOCATION AND TIME ────────────────────────────────────────────────────

    def location(self) -> str:
        """Gets the location of the incident."""
        return str(self._data.get("LOCATION_AND_TIME", {}).get("location", ""))

    def location_type(self) -> str:
        """Gets the type of location."""
        return str(self._data.get("LOCATION_AND_TIME", {}).get("location_type", ""))

    def is_public_place(self) -> bool:
        """Checks if the incident took place in a public place."""
        return self.location_type().lower() == "public"

    def date(self) -> str:
        """Gets the date of the incident."""
        return str(self._data.get("LOCATION_AND_TIME", {}).get("date", ""))

    def time_of_incident(self) -> str:
        """Gets the time of the incident."""
        return str(self._data.get("LOCATION_AND_TIME", {}).get("time", ""))

    def time_of_day(self) -> str:
        """Gets the time of day of the incident."""
        return str(self._data.get("LOCATION_AND_TIME", {}).get("time_of_day", ""))

    # ── CONSENT AND INTENT ───────────────────────────────────────────────────

    def consent_given(self) -> bool | str:
        """Gets consent information."""
        val = self._data.get("CONSENT_AND_INTENT", {}).get("consent_given", False)
        if isinstance(val, bool):
            return val
        return str(val)

    def no_consent(self) -> bool:
        """Checks if consent was explicitly not given."""
        return self.consent_given() is False

    def premeditation(self) -> bool | str:
        """Gets premeditation information."""
        val = self._data.get("CONSENT_AND_INTENT", {}).get("premeditation", False)
        if isinstance(val, bool):
            return val
        return str(val)

    def accused_known_to_victim(self) -> bool | str:
        """Checks if the accused was known to the victim."""
        val = self._data.get("CONSENT_AND_INTENT", {}).get("accused_known_to_victim", False)
        if isinstance(val, bool):
            return val
        return str(val)

    # ── MISSING INFORMATION ──────────────────────────────────────────────────

    def missing_fields(self) -> list[str]:
        """Gets the list of missing fields."""
        fields_data = self._data.get("MISSING_INFORMATION", {}).get("missing_fields", [])
        return [str(f) for f in fields_data]

    def is_missing(self, field: str) -> bool:
        """Checks if a specific field is missing."""
        return field in self.missing_fields()

    # ── CONFIDENCE ───────────────────────────────────────────────────────────

    def extraction_confidence(self) -> float:
        """Gets the extraction confidence score."""
        try:
            return float(self._data.get("CONFIDENCE", {}).get("extraction_confidence", 0.0))
        except (ValueError, TypeError):
            return 0.0

    def ambiguous_parts(self) -> list[str]:
        """Gets the list of ambiguous parts in the extraction."""
        parts_data = self._data.get("CONFIDENCE", {}).get("ambiguous_parts", [])
        return [str(p) for p in parts_data]

    def is_low_confidence(self) -> bool:
        """Checks if the extraction confidence is low."""
        return self.extraction_confidence() < 0.70


# ── RuleResult ────────────────────────────────────────────────────────────────

@dataclass
class RuleResult:
    """
    Represents the result of evaluating a single legal rule or section.
    """
    section_id: str
    title: str
    status: str
    confidence: float
    triggered_conditions: list[str]
    failed_conditions: list[str]
    explanation: str
    punishment: str
    clarification_questions: list[str]
    reasoning_trace: list[str]

    def __post_init__(self) -> None:
        """Validates the status after dataclass initialization."""
        valid_statuses = {"applicable", "not_applicable", "needs_clarification"}
        if self.status not in valid_statuses:
            raise ValueError(
                f"Invalid status: '{self.status}'. Must be one of: {', '.join(sorted(valid_statuses))}"
            )

    def to_dict(self) -> dict[str, Any]:
        """Converts the RuleResult instance into a plain dictionary representation."""
        return {
            "section_id": self.section_id,
            "title": self.title,
            "status": self.status,
            "confidence": self.confidence,
            "triggered_conditions": list(self.triggered_conditions),
            "failed_conditions": list(self.failed_conditions),
            "explanation": self.explanation,
            "punishment": self.punishment,
            "clarification_questions": list(self.clarification_questions),
            "reasoning_trace": list(self.reasoning_trace),
        }


# ── ConfidenceCalculator ──────────────────────────────────────────────────────

class ConfidenceCalculator:
    """
    Calculates rule evaluation confidence based on base score, weight adjustments
    for high/medium criteria factors, penalty for missing relevant information,
    and a penalty for low confidence NLP extraction.
    """

    def compute(
        self,
        facts: FactsAccessor,
        high_factors: list[bool],
        medium_factors: list[bool],
        relevant_missing_fields: list[str]
    ) -> float:
        """Computes the final confidence score."""
        score = 0.50

        # High priority factors (+0.15 for each True)
        for h in high_factors:
            if h:
                score += 0.15

        # Medium priority factors (+0.08 for each True)
        for m in medium_factors:
            if m:
                score += 0.08

        # Relevant missing fields penalty (-0.10 for each missing field)
        for field in relevant_missing_fields:
            if facts.is_missing(field):
                score -= 0.10

        # Low NLP confidence penalty (-0.15 once)
        if facts.is_low_confidence():
            score -= 0.15

        # Clamp to [0.0, 1.0]
        score = max(0.0, min(score, 1.0))

        # Round to 2 decimal places
        return round(score, 2)


# ── Rule Checkers ─────────────────────────────────────────────────────────────

def check_theft(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Evaluates whether BNS Section 303 (Theft) is applicable to the given facts."""
    c1 = facts.is_movable()
    c2 = facts.no_consent()
    c3 = facts.has_verb(TAKING_VERBS)

    snatching_action = any(
        s in facts.primary_action().lower()
        for s in ["snatching", "snatch", "robbery", "robbed", "chain snatching", "bag snatching"]
    )
    c4 = not (
        facts.violence_involved()
        or facts.threat_made()
        or snatching_action
        or facts.has_verb(["forcibly"])
    )

    applicable = c1 and c2 and c3 and c4
    status = "applicable" if applicable else "not_applicable"

    reasoning_trace = [
        f"[BNS_303] is_movable -> {c1} (value: {facts.property_type()})",
        f"[BNS_303] no_consent -> {c2} (value: {facts.consent_given()})",
        f"[BNS_303] taking verb present -> {c3} (matched in: {facts.action_verbs()})",
        f"[BNS_303] not excluded by force+threat -> {c4}",
        f"[BNS_303] -> {'APPLICABLE' if applicable else 'NOT APPLICABLE'}"
    ]

    triggered = []
    failed = []
    conds = [
        (c1, "Movable property involved"),
        (c2, "No consent given by victim"),
        (c3, "Taking verb present in narrative"),
        (c4, "Not excluded by violence, threat, or snatching")
    ]
    for state, desc in conds:
        if state:
            triggered.append(desc)
        else:
            failed.append(desc)

    if applicable:
        confidence = calc.compute(
            facts=facts,
            high_factors=[c1, c2, c3],
            medium_factors=[bool(facts.property_items()), not facts.accused_known_to_victim()],
            relevant_missing_fields=["accused_identity", "property_value", "exact_location"]
        )
        explanation = (
            f"BNS Section 303 (Theft) applies. The accused dishonestly "
            f"removed {facts.property_items()} from complainant's possession at "
            f"{facts.location()} on {facts.date()}. No force or threat was used."
        )
        triggered_conditions = triggered
        failed_conditions = []
        clarification_questions = []
    else:
        if c1 and c3 and c4 and facts.consent_given() == "unknown":
            status = "needs_clarification"
            confidence = 0.0
            explanation = "Suspected Theft (BNS 303), but consent status is unknown. Clarification is required."
            triggered_conditions = triggered
            failed_conditions = ["No consent given by victim"]
            clarification_questions = [
                "Did you hand over the property voluntarily, or was it taken from you without permission?"
            ]
        else:
            confidence = 0.0
            explanation = "Conditions not met for theft."
            triggered_conditions = []
            failed_conditions = failed
            clarification_questions = ["What type of property was involved?"] if not c1 else []

    punishment = "Up to 3 years imprisonment and/or fine."

    return RuleResult(
        section_id="BNS_303",
        title="Theft",
        status=status,
        confidence=confidence,
        triggered_conditions=triggered_conditions,
        failed_conditions=failed_conditions,
        explanation=explanation,
        punishment=punishment,
        clarification_questions=clarification_questions,
        reasoning_trace=reasoning_trace
    )


def check_robbery(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Evaluates whether BNS Section 304 (Robbery) is applicable to the given facts."""
    c1 = facts.is_movable()
    c2 = facts.no_consent()
    c3 = facts.has_verb(TAKING_VERBS)

    snatching_action = any(
        s in facts.primary_action().lower()
        for s in ["snatching", "snatch", "robbery", "robbed", "chain snatching", "bag snatching"]
    )
    c4 = (
        facts.violence_involved()
        or facts.threat_made()
        or snatching_action
        or facts.has_verb(["forcibly"])
    )

    applicable = c1 and c2 and c3 and c4
    status = "applicable" if applicable else "not_applicable"

    c4_triggers = []
    if facts.violence_involved():
        c4_triggers.append("violence_involved")
    if facts.threat_made():
        c4_triggers.append("threat_made")
    if snatching_action:
        c4_triggers.append("snatching_action")
    if facts.has_verb(["forcibly"]):
        c4_triggers.append("verb 'forcibly'")
    c4_trigger_str = ", ".join(c4_triggers) if c4_triggers else "none"

    reasoning_trace = [
        f"[BNS_304] is_movable -> {c1} (value: {facts.property_type()})",
        f"[BNS_304] no_consent -> {c2} (value: {facts.consent_given()})",
        f"[BNS_304] taking verb present -> {c3} (matched in: {facts.action_verbs()})",
        f"[BNS_304] force/snatching condition (c4) -> {c4} (triggered by: {c4_trigger_str})",
        f"[BNS_304] -> {'APPLICABLE' if applicable else 'NOT APPLICABLE'}"
    ]

    triggered = []
    failed = []
    conds = [
        (c1, "Movable property involved"),
        (c2, "No consent given by victim"),
        (c3, "Taking verb present in narrative"),
        (c4, f"Force or snatching present (triggered by {c4_trigger_str})")
    ]
    for state, desc in conds:
        if state:
            triggered.append(desc)
        else:
            failed.append(desc)

    if applicable:
        confidence = calc.compute(
            facts=facts,
            high_factors=[c1, c2, c4, c3],
            medium_factors=[snatching_action, facts.is_public_place()],
            relevant_missing_fields=["accused_identity", "witness_details"]
        )
        explanation = (
            f"BNS Section 304 (Robbery) applies. The taking of "
            f"{facts.property_items()} valued at {facts.financial_amount()} involved "
            f"force or snatching near {facts.location()} on {facts.date()}."
        )
        triggered_conditions = triggered
        failed_conditions = []
        clarification_questions = []
    else:
        if c1 and c3 and c4 and facts.consent_given() == "unknown":
            status = "needs_clarification"
            confidence = 0.0
            explanation = "Suspected Robbery (BNS 304), but consent status is unknown. Clarification is required."
            triggered_conditions = triggered
            failed_conditions = ["No consent given by victim"]
            clarification_questions = [
                "Did you hand over the property voluntarily, or was it taken from you without permission?"
            ]
        else:
            confidence = 0.0
            explanation = "Conditions not met for robbery."
            triggered_conditions = []
            failed_conditions = failed
            clarification_questions = ["What type of property was involved?"] if not c1 else []

    punishment = "Up to 10 years rigorous imprisonment and fine."

    return RuleResult(
        section_id="BNS_304",
        title="Robbery",
        status=status,
        confidence=confidence,
        triggered_conditions=triggered_conditions,
        failed_conditions=failed_conditions,
        explanation=explanation,
        punishment=punishment,
        clarification_questions=clarification_questions,
        reasoning_trace=reasoning_trace
    )


def check_hurt(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Evaluates whether BNS Section 115 (Voluntarily Causing Hurt) is applicable."""
    c1 = facts.violence_involved()
    c2 = facts.has_verb(HURT_VERBS)

    applicable = c1 and c2
    status = "applicable" if applicable else "not_applicable"
    clarification_questions = []

    if applicable and facts.weapon_used() is not None:
        status = "needs_clarification"
        clarification_questions = [
            "A weapon was mentioned. Please describe the injuries in detail — "
            "were any bones broken or was there permanent disfigurement? "
            "This determines whether BNS 117 (Grievous Hurt) applies instead."
        ]

    reasoning_trace = [
        f"[BNS_115] violence_involved -> {c1}",
        f"[BNS_115] hurt verb present -> {c2} (matched in: {facts.action_verbs()})",
        f"[BNS_115] weapon check -> {'needs_clarification' if applicable and facts.weapon_used() is not None else 'no_exclusion_triggered'}",
        f"[BNS_115] -> {status.upper().replace('_', ' ')}"
    ]

    triggered = []
    failed = []
    conds = [
        (c1, "Violence was involved in the incident"),
        (c2, "Hurt verb present in narrative")
    ]
    for state, desc in conds:
        if state:
            triggered.append(desc)
        else:
            failed.append(desc)

    if applicable or status == "needs_clarification":
        confidence = calc.compute(
            facts=facts,
            high_factors=[c1, c2],
            medium_factors=[facts.has_witnesses(), facts.is_public_place()],
            relevant_missing_fields=["medical_report", "injury_description"]
        )
        explanation = (
            f"BNS Section 115 (Voluntarily Causing Hurt) may apply. The incident on "
            f"{facts.date()} at {facts.location()} involved violence causing physical pain/hurt."
        )
        triggered_conditions = triggered
        failed_conditions = []
    else:
        confidence = 0.0
        explanation = "Conditions not met for causing hurt."
        triggered_conditions = []
        failed_conditions = failed

    punishment = "Up to 1 year imprisonment and/or fine up to Rs. 10,000."

    return RuleResult(
        section_id="BNS_115",
        title="Voluntarily Causing Hurt",
        status=status,
        confidence=confidence,
        triggered_conditions=triggered_conditions,
        failed_conditions=failed_conditions,
        explanation=explanation,
        punishment=punishment,
        clarification_questions=clarification_questions,
        reasoning_trace=reasoning_trace
    )


def check_grievous_hurt(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Evaluates whether BNS Section 117 (Grievous Hurt) is applicable."""
    c1 = facts.violence_involved()
    c2 = facts.weapon_used() is not None or facts.has_verb(GRIEVOUS_VERBS)

    applicable = c1 and c2
    status = "applicable" if applicable else "not_applicable"

    reasoning_trace = [
        f"[BNS_117] violence_involved -> {c1}",
        f"[BNS_117] weapon used or grievous verb present -> {c2} (weapon: {facts.weapon_used()}, matched in: {facts.action_verbs()})",
        f"[BNS_117] -> {status.upper().replace('_', ' ')}"
    ]

    triggered = []
    failed = []
    conds = [
        (c1, "Violence was involved in the incident"),
        (c2, "Weapon used or grievous injury verb present")
    ]
    for state, desc in conds:
        if state:
            triggered.append(desc)
        else:
            failed.append(desc)

    if applicable:
        confidence = calc.compute(
            facts=facts,
            high_factors=[c1, c2],
            medium_factors=[facts.financial_loss()],
            relevant_missing_fields=["medical_report"]
        )
        explanation = (
            f"BNS Section 117 (Grievous Hurt) applies. The incident on {facts.date()} "
            f"at {facts.location()} involved violence and a weapon or grievous injury."
        )
        triggered_conditions = triggered
        failed_conditions = []
    else:
        confidence = 0.0
        explanation = "Conditions not met for grievous hurt."
        triggered_conditions = []
        failed_conditions = failed

    punishment = "Up to 7 years rigorous imprisonment and fine."

    return RuleResult(
        section_id="BNS_117",
        title="Voluntarily Causing Grievous Hurt",
        status=status,
        confidence=confidence,
        triggered_conditions=triggered_conditions,
        failed_conditions=failed_conditions,
        explanation=explanation,
        punishment=punishment,
        clarification_questions=[],
        reasoning_trace=reasoning_trace
    )


def check_intimidation(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Evaluates whether BNS Section 351 (Criminal Intimidation) is applicable."""
    c1 = facts.threat_made()
    c2 = facts.has_verb(THREAT_VERBS) or any(
        t in facts.primary_action().lower()
        for t in ["intimidation", "threat", "blackmail"]
    )

    applicable = c1 and c2
    status = "applicable" if applicable else "not_applicable"
    clarification_questions = []

    if c1 and not c2:
        status = "needs_clarification"
        clarification_questions = [
            "A threat was recorded but no specific threatening words were captured. "
            "Ask the complainant: What exactly did the accused say? "
            "Were the words threatening in nature?"
        ]

    reasoning_trace = [
        f"[BNS_351] threat_made -> {c1}",
        f"[BNS_351] threat verb or primary action matches -> {c2} (matched in: {facts.action_verbs()})",
        f"[BNS_351] -> {status.upper().replace('_', ' ')}"
    ]

    triggered = []
    failed = []
    conds = [
        (c1, "Threat was made to victim"),
        (c2, "Threat verb or primary action indicates intimidation")
    ]
    for state, desc in conds:
        if state:
            triggered.append(desc)
        else:
            failed.append(desc)

    if applicable or status == "needs_clarification":
        confidence = calc.compute(
            facts=facts,
            high_factors=[c1, c2],
            medium_factors=[facts.accused_known_to_victim() is True],
            relevant_missing_fields=["witness_details", "evidence_available"]
        )
        explanation = (
            f"BNS Section 351 (Criminal Intimidation) applies or is suspected. Threatening "
            f"behavior was recorded on {facts.date()} at {facts.location()}."
        )
        triggered_conditions = triggered
        failed_conditions = []
    else:
        confidence = 0.0
        explanation = "Conditions not met for criminal intimidation."
        triggered_conditions = []
        failed_conditions = failed

    punishment = "Up to 2 years simple imprisonment and/or fine."

    return RuleResult(
        section_id="BNS_351",
        title="Criminal Intimidation",
        status=status,
        confidence=confidence,
        triggered_conditions=triggered_conditions,
        failed_conditions=failed_conditions,
        explanation=explanation,
        punishment=punishment,
        clarification_questions=clarification_questions,
        reasoning_trace=reasoning_trace
    )


def check_cheating(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Evaluates whether BNS Section 318 (Cheating) is applicable."""
    c1 = facts.financial_loss() or facts.property_involved()
    c2 = facts.consent_given() is True
    c3 = facts.premeditation() is True
    c4 = facts.has_verb(FRAUD_VERBS)

    applicable = c1 and c2 and c3 and c4
    status = "applicable" if applicable else "not_applicable"
    clarification_questions = []

    if not applicable and c1 and c4 and facts.consent_given() == "unknown":
        status = "needs_clarification"
        clarification_questions = [
            "Did you hand over the money or property voluntarily, or was it taken from you without permission?"
        ]

    reasoning_trace = [
        f"[BNS_318] financial_loss or property_involved -> {c1}",
        f"[BNS_318] consent_given is True -> {c2} (value: {facts.consent_given()})",
        f"[BNS_318] premeditation is True -> {c3} (value: {facts.premeditation()})",
        f"[BNS_318] fraud verb present -> {c4} (matched in: {facts.action_verbs()})",
        f"[BNS_318] -> {status.upper().replace('_', ' ')}"
    ]

    triggered = []
    failed = []
    conds = [
        (c1, "Financial loss or property involved"),
        (c2, "Consent given by victim (meaning induced by deception)"),
        (c3, "Premeditation or prior planning present"),
        (c4, "Fraud verb present in narrative")
    ]
    for state, desc in conds:
        if state:
            triggered.append(desc)
        else:
            failed.append(desc)

    if applicable or status == "needs_clarification":
        confidence = calc.compute(
            facts=facts,
            high_factors=[c1, c3, c4],
            medium_factors=[facts.financial_amount() is not None, facts.accused_known_to_victim() is True],
            relevant_missing_fields=["evidence_available", "prior_relationship", "transaction_proof"]
        )
        explanation = (
            f"BNS Section 318 (Cheating) applies or is suspected. The complainant "
            f"suffered loss or property involvement under deceptive circumstances near {facts.location()}."
        )
        triggered_conditions = triggered
        failed_conditions = []
    else:
        confidence = 0.0
        explanation = "Conditions not met for cheating."
        triggered_conditions = []
        failed_conditions = failed

    punishment = "Up to 3 years imprisonment and/or fine."

    return RuleResult(
        section_id="BNS_318",
        title="Cheating",
        status=status,
        confidence=confidence,
        triggered_conditions=triggered_conditions,
        failed_conditions=failed_conditions,
        explanation=explanation,
        punishment=punishment,
        clarification_questions=clarification_questions,
        reasoning_trace=reasoning_trace
    )


# ── Checker Stubs ─────────────────────────────────────────────────────────────

def check_extortion(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Stub checker for BNS Section 308 (Extortion)."""
    return RuleResult(
        section_id="BNS_308",
        title="Extortion",
        status="not_applicable",
        confidence=0.0,
        triggered_conditions=[],
        failed_conditions=["Extortion checker logic not implemented"],
        explanation="Not implemented",
        punishment="Up to 3 years imprisonment and/or fine.",
        clarification_questions=[],
        reasoning_trace=["[BNS_308] Extortion check not implemented -> NOT APPLICABLE"]
    )


def check_breach_of_trust(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Stub checker for BNS Section 316 (Criminal Breach of Trust)."""
    return RuleResult(
        section_id="BNS_316",
        title="Criminal Breach of Trust",
        status="not_applicable",
        confidence=0.0,
        triggered_conditions=[],
        failed_conditions=["Breach of trust checker logic not implemented"],
        explanation="Not implemented",
        punishment="Up to 3 years imprisonment and/or fine.",
        clarification_questions=[],
        reasoning_trace=["[BNS_316] Breach of trust check not implemented -> NOT APPLICABLE"]
    )


def check_mischief(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Stub checker for BNS Section 324 (Mischief)."""
    return RuleResult(
        section_id="BNS_324",
        title="Mischief",
        status="not_applicable",
        confidence=0.0,
        triggered_conditions=[],
        failed_conditions=["Mischief checker logic not implemented"],
        explanation="Not implemented",
        punishment="Up to 1 year imprisonment and/or fine.",
        clarification_questions=[],
        reasoning_trace=["[BNS_324] Mischief check not implemented -> NOT APPLICABLE"]
    )


def check_house_trespass(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Stub checker for BNS Section 329 (House Trespass)."""
    return RuleResult(
        section_id="BNS_329",
        title="House Trespass",
        status="not_applicable",
        confidence=0.0,
        triggered_conditions=[],
        failed_conditions=["House trespass checker logic not implemented"],
        explanation="Not implemented",
        punishment="Up to 1 year imprisonment and/or fine.",
        clarification_questions=[],
        reasoning_trace=["[BNS_329] House trespass check not implemented -> NOT APPLICABLE"]
    )


def check_rash_driving(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Stub checker for BNS Section 281 (Rash Driving)."""
    return RuleResult(
        section_id="BNS_281",
        title="Rash Driving",
        status="not_applicable",
        confidence=0.0,
        triggered_conditions=[],
        failed_conditions=["Rash driving checker logic not implemented"],
        explanation="Not implemented",
        punishment="Up to 6 months imprisonment and/or fine.",
        clarification_questions=[],
        reasoning_trace=["[BNS_281] Rash driving check not implemented -> NOT APPLICABLE"]
    )


def check_sexual_harassment(facts: FactsAccessor, calc: ConfidenceCalculator) -> RuleResult:
    """Stub checker for BNS Section 75 (Sexual Harassment)."""
    return RuleResult(
        section_id="BNS_75",
        title="Sexual Harassment",
        status="not_applicable",
        confidence=0.0,
        triggered_conditions=[],
        failed_conditions=["Sexual harassment checker logic not implemented"],
        explanation="Not implemented",
        punishment="Up to 3 years imprisonment and/or fine.",
        clarification_questions=[],
        reasoning_trace=["[BNS_75] Sexual harassment check not implemented -> NOT APPLICABLE"]
    )


# ── ConflictResolver ──────────────────────────────────────────────────────────

class ConflictResolver:
    """
    Resolves overlaps or conflicts between multiple applicable legal sections
    by applying priority rules.
    """

    def resolve(
        self,
        applicable: list[RuleResult],
        facts: FactsAccessor
    ) -> tuple[list[RuleResult], list[RuleResult]]:
        """Resolves conflicts in applicable rule results based on ordering rules."""
        active = {res.section_id: res for res in applicable}
        newly_removed = []

        # Rule 1: Theft vs Robbery
        if "BNS_304" in active and "BNS_303" in active:
            res = active.pop("BNS_303")
            res.status = "not_applicable"
            reason = "Subsumed by BNS_304 (Robbery) - force/snatching present"
            res.explanation = reason
            res.failed_conditions.append(reason)
            newly_removed.append(res)

        # Rule 2: Hurt vs Grievous Hurt
        if "BNS_117" in active and "BNS_115" in active:
            res = active.pop("BNS_115")
            res.status = "not_applicable"
            reason = "Subsumed by BNS_117 (Grievous Hurt) - weapon/serious injury"
            res.explanation = reason
            res.failed_conditions.append(reason)
            newly_removed.append(res)

        # Rule 3: Extortion vs Criminal Intimidation
        if "BNS_308" in active and "BNS_351" in active and facts.financial_loss():
            res = active.pop("BNS_351")
            res.status = "not_applicable"
            reason = "Subsumed by BNS_308 (Extortion) - threat led to property loss"
            res.explanation = reason
            res.failed_conditions.append(reason)
            newly_removed.append(res)

        # Rule 4: Breach of Trust vs Cheating
        if "BNS_316" in active and "BNS_318" in active:
            if facts.accused_known_to_victim() is True:
                res = active.pop("BNS_318")
                res.status = "not_applicable"
                reason = "Subsumed by BNS_316 (Breach of Trust) - accused had prior custody"
                res.explanation = reason
                res.failed_conditions.append(reason)
                newly_removed.append(res)
            else:
                res = active.pop("BNS_316")
                res.status = "not_applicable"
                reason = "Subsumed by BNS_318 (Cheating) - no prior custody relationship"
                res.explanation = reason
                res.failed_conditions.append(reason)
                newly_removed.append(res)

        kept = [res for res in applicable if res.section_id in active]
        return kept, newly_removed


# ── ClarificationEngine ───────────────────────────────────────────────────────

class ClarificationEngine:
    """
    Identifies missing information from facts or pending rule clarifications,
    generating prioritized follow-up questions.
    """

    MISSING_FIELD_QUESTION_MAP = {
        "accused_identity":   "Can you describe the accused - height, build, clothing, age, any distinguishing features?",
        "exact_location":     "Can you specify the exact location - street name, landmark, or nearby shop?",
        "date_of_incident":   "On what exact date did the incident occur?",
        "time_of_incident":   "At approximately what time did the incident occur?",
        "witness_details":    "Were there any witnesses? If yes, please provide their names and contact details.",
        "evidence_available": "Is there any evidence - CCTV footage, photos, messages, or physical evidence?",
        "medical_report":     "Did you seek medical treatment after the incident? If yes, please share the medical report.",
        "motive":             "Do you know of any reason why the accused may have targeted you?",
        "prior_relationship": "Did you know the accused before this incident? What was your relationship?",
        "property_value":     "What is the approximate value of the stolen or damaged property?",
        "transaction_proof":  "Do you have any receipts, messages, or documents related to the transaction?",
        "vehicle_details":    "Can you describe the vehicle involved - make, model, colour, registration number?",
        "prior_complaints":   "Have you filed any previous complaints against this person?"
    }

    def generate_questions(
        self,
        facts: FactsAccessor,
        needs_clarification_results: list[RuleResult]
    ) -> list[dict]:
        """Generates clarification questions based on general missing fields and specific pending rules."""
        seen_fields = set()
        results = []

        # 1. Process general missing fields
        for field in facts.missing_fields():
            if field in seen_fields:
                continue
            question = self.MISSING_FIELD_QUESTION_MAP.get(field)
            if not question:
                continue
            seen_fields.add(field)

            is_high = field in ["accused_identity", "violence_involved", "consent_given", "force_used", "exact_location"]
            priority = "high" if is_high else "medium"

            results.append({
                "section_id": "general",
                "missing_field": field,
                "priority": priority,
                "question": question
            })

        # 2. Process specific clarification questions from RuleResults
        for res in needs_clarification_results:
            for q in res.clarification_questions:
                if "weapon" in q.lower() or "injury" in q.lower():
                    field_name = "injury_description"
                elif "threat" in q.lower():
                    field_name = "threat_details"
                elif "consent" in q.lower() or "voluntarily" in q.lower():
                    field_name = "consent_given"
                else:
                    field_name = f"{res.section_id.lower()}_clarification"

                if field_name in seen_fields:
                    continue
                seen_fields.add(field_name)

                is_high = field_name in ["accused_identity", "violence_involved", "consent_given", "force_used", "exact_location"]
                priority = "high" if is_high else "medium"

                results.append({
                    "section_id": res.section_id,
                    "missing_field": field_name,
                    "priority": priority,
                    "question": q
                })

        return results


# ── BNSRuleEngine ─────────────────────────────────────────────────────────────

class BNSRuleEngine:
    """
    Orchestrates the BNS Rule Engine inference by executing individual BNS legal checks,
    resolving overlaps/conflicts, generating clarification questions, and checking FIR quality.
    """

    def __init__(self) -> None:
        self.calc = ConfidenceCalculator()
        self.resolver = ConflictResolver()
        self.clarification_engine = ClarificationEngine()
        self.all_checkers = [
            check_theft, check_robbery, check_hurt, check_grievous_hurt,
            check_intimidation, check_extortion, check_cheating,
            check_breach_of_trust, check_mischief, check_house_trespass,
            check_rash_driving, check_sexual_harassment
        ]

    def infer(self, raw_nlp_output: dict) -> dict:
        facts = FactsAccessor(raw_nlp_output)
        all_results = [checker(facts, self.calc) for checker in self.all_checkers]

        applicable = [r for r in all_results if r.status == "applicable"]
        needs_clarification = [r for r in all_results if r.status == "needs_clarification"]
        not_applicable = [r for r in all_results if r.status == "not_applicable"]

        kept, removed = self.resolver.resolve(applicable, facts)
        not_applicable.extend(removed)

        kept.sort(key=lambda r: r.confidence, reverse=True)

        questions = self.clarification_engine.generate_questions(facts, needs_clarification)

        full_trace = []
        for r in all_results:
            full_trace.extend(r.reasoning_trace)

        overall_confidence = (
            round(sum(r.confidence for r in kept) / len(kept), 2)
            if kept else 0.0
        )

        if not kept:
            status = "insufficient_data"
            action = "Insufficient information to determine applicable sections"
        elif overall_confidence >= 0.6:
            status = "complete"
            action = "Proceed with FIR drafting" if overall_confidence >= 0.7 else "Seek additional information before filing"
        else:
            status = "partial"
            action = "Seek additional information before filing"

        quality_flags = []
        if facts.missing_fields():
            quality_flags.append({
                "flag_type": "missing_info",
                "description": f"Missing fields: {facts.missing_fields()}",
                "recommendation": "Gather missing information before finalising FIR"
            })
        if facts.is_low_confidence():
            quality_flags.append({
                "flag_type": "low_confidence",
                "description": f"NLP extraction confidence is {facts.extraction_confidence()}",
                "recommendation": "Review extracted entities manually"
            })
        if facts.ambiguous_parts():
            quality_flags.append({
                "flag_type": "ambiguity",
                "description": f"Ambiguous narrative parts: {facts.ambiguous_parts()}",
                "recommendation": "Clarify ambiguous sections with complainant"
            })

        return {
            "processing_status": status,
            "primary_section": kept[0].to_dict() if kept else None,
            "alternative_sections": [r.to_dict() for r in kept[1:]],
            "not_applicable_sections": [
                {"section_id": r.section_id, "title": r.title,
                 "failed_conditions": r.failed_conditions}
                for r in not_applicable
            ],
            "clarification_questions": questions,
            "reasoning_trace": full_trace,
            "fir_quality_flags": quality_flags,
            "overall_confidence": overall_confidence,
            "recommended_action": action
        }

    def batch_infer(self, inputs: list[dict]) -> list[dict]:
        return [self.infer(i) for i in inputs]


if __name__ == "__main__":
    sample_json = {
        "PEOPLE": {
            "victim": "complainant",
            "accused": "unknown person(s)",
            "witnesses": ["named Ramesh Patil"],
            "third_parties": []
        },
        "INCIDENT": {
            "primary_action": "snatching",
            "action_verbs": ["fled", "forcibly", "snatched"],
            "violence_involved": False,
            "weapon_used": None,
            "threat_made": False
        },
        "PROPERTY": {
            "property_involved": True,
            "property_items": ["motorcycle", "ring", "chain", "gold"],
            "property_type": "movable",
            "financial_loss": True,
            "financial_amount": "Rs. 45,000"
        },
        "LOCATION_AND_TIME": {
            "location": "Laxmi Chowk in Pune",
            "location_type": "public",
            "date": "June 15, 2024",
            "time": "9:00 PM",
            "time_of_day": "night"
        },
        "CONSENT_AND_INTENT": {
            "consent_given": False,
            "premeditation": False,
            "accused_known_to_victim": False
        },
        "MISSING_INFORMATION": {
            "missing_fields": ["accused_identity", "motive", "evidence_available"]
        },
        "CONFIDENCE": {
            "extraction_confidence": 0.75,
            "ambiguous_parts": []
        }
    }

    engine = BNSRuleEngine()
    result = engine.infer(sample_json)

    print("=" * 60)
    print("               BNS RULE ENGINE INFERENCE SUMMARY               ")
    print("=" * 60)
    print(f"Processing Status:   {result['processing_status'].upper()}")
    print(f"Recommended Action:  {result['recommended_action']}")
    print(f"Overall Confidence:  {result['overall_confidence']}")
    print("-" * 60)

    primary = result['primary_section']
    if primary:
        print("PRIMARY APPLICABLE SECTION:")
        print(f"  Section ID:  {primary['section_id']}")
        print(f"  Title:       {primary['title']}")
        print(f"  Confidence:  {primary['confidence']}")
        print(f"  Explanation: {primary['explanation']}")
        print(f"  Punishment:  {primary['punishment']}")
    else:
        print("PRIMARY APPLICABLE SECTION: None")

    print("-" * 60)
    print(f"Alternative Sections Count: {len(result['alternative_sections'])}")
    for idx, alt in enumerate(result['alternative_sections'], 1):
        print(f"  {idx}. {alt['section_id']} - {alt['title']} (Confidence: {alt['confidence']})")

    print("-" * 60)
    print("CLARIFICATION QUESTIONS REQUIRED:")
    if result['clarification_questions']:
        for idx, q in enumerate(result['clarification_questions'], 1):
            print(f"  {idx}. [{q['section_id']}] ({q['priority'].upper()}) {q['missing_field']}: {q['question']}")
    else:
        print("  None")

    print("-" * 60)
    print("FIR QUALITY FLAGS:")
    if result['fir_quality_flags']:
        for idx, flag in enumerate(result['fir_quality_flags'], 1):
            print(f"  {idx}. [{flag['flag_type'].upper()}] {flag['description']}")
            print(f"     Recommendation: {flag['recommendation']}")
    else:
        print("  None")
    print("=" * 60)
