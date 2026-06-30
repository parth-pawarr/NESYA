"""
FIR Service — wraps the existing NLP pipeline and BNS Rule Engine
without modifying any of the core logic.
"""
import sys
from pathlib import Path
from typing import Optional

# ── Add NESYA root to sys.path so existing modules can be imported ─────────────
# fir_service.py is at: NESYA/backend/app/services/fir_service.py
# parents[0] = NESYA/backend/app/services/
# parents[1] = NESYA/backend/app/
# parents[2] = NESYA/backend/
# parents[3] = NESYA/  ← this is what we want
_root = Path(__file__).resolve().parents[3]  # NESYA root
sys.path.insert(0, str(_root / "NLP_Pipeline"))
sys.path.insert(0, str(_root / "Rule_Engine"))

try:
    from fir_extractor import extract_fir           # existing NLP pipeline
    from bns_rule_engine import BNSRuleEngine       # existing rule engine
    _PIPELINE_AVAILABLE = True
except ImportError as e:
    _PIPELINE_AVAILABLE = False
    _IMPORT_ERROR = str(e)


# Singleton rule engine instance (thread-safe for read-only inference)
_rule_engine = None  # type: ignore


def _get_rule_engine():
    global _rule_engine
    if _rule_engine is None:
        _rule_engine = BNSRuleEngine()
    return _rule_engine


def analyze_narrative(narrative: str) -> dict:
    """
    Run the full NLP + Rule Engine pipeline on the given narrative.

    Returns a combined dict:
      {
        "nlp_result": {...},    # output of extract_fir()
        "rule_result": {...},   # output of BNSRuleEngine.infer()
        "success": bool,
        "error": str | None
      }
    """
    if not _PIPELINE_AVAILABLE:
        return {
            "nlp_result": {},
            "rule_result": {},
            "success": False,
            "error": f"Pipeline not available: {_IMPORT_ERROR}"
        }

    if not narrative or not narrative.strip():
        return {
            "nlp_result": {},
            "rule_result": {},
            "success": False,
            "error": "Empty narrative provided."
        }

    try:
        nlp_result = extract_fir(narrative)
    except Exception as e:
        return {
            "nlp_result": {},
            "rule_result": {},
            "success": False,
            "error": f"NLP extraction failed: {e}"
        }

    try:
        engine = _get_rule_engine()
        rule_result = engine.infer(nlp_result)
    except Exception as e:
        return {
            "nlp_result": nlp_result,
            "rule_result": {},
            "success": False,
            "error": f"Rule engine inference failed: {e}"
        }

    return {
        "nlp_result": nlp_result,
        "rule_result": rule_result,
        "success": True,
        "error": None
    }


def get_missing_fields(nlp_result: dict) -> list[str]:
    """Extract the list of missing fields from the NLP result."""
    return nlp_result.get("MISSING_INFORMATION", {}).get("missing_fields", [])


def get_confidence(nlp_result: dict) -> float:
    """Get the extraction confidence score."""
    return nlp_result.get("CONFIDENCE", {}).get("extraction_confidence", 0.0)


def compute_completion_percentage(nlp_result: dict, rule_result: dict) -> int:
    """
    Calculate FIR completion percentage based on how many required fields
    are filled vs missing. Also considers if a primary legal section was found.
    """
    if not nlp_result:
        return 0

    # Mandatory fields (weighted)
    mandatory = [
        "exact_location",
        "date_of_incident",
        "time_of_incident",
        "accused_identity",
    ]
    # Optional but important
    optional = [
        "witness_details",
        "property_value",
        "prior_relationship",
        "motive",
        "evidence_available",
        "medical_report",
    ]

    missing = get_missing_fields(nlp_result)
    missing_set = set(missing)

    # Check what we have
    people = nlp_result.get("PEOPLE", {})
    incident = nlp_result.get("INCIDENT", {})
    loc = nlp_result.get("LOCATION_AND_TIME", {})

    # Core checks
    has_incident_type = incident.get("primary_action", "unknown") != "unknown"
    has_location = loc.get("location") is not None
    has_date = loc.get("date") is not None
    has_time = loc.get("time") is not None
    has_accused = people.get("accused") not in ("not identified in narrative",)
    has_primary_section = bool(rule_result.get("primary_section"))

    # Score out of 10
    score = 0
    if has_incident_type:
        score += 2  # Most important
    if has_location:
        score += 2
    if has_date:
        score += 1
    if has_time:
        score += 1
    if has_accused:
        score += 1
    if bool(people.get("victim") and people.get("victim") != "complainant"):
        score += 1
    if has_primary_section:
        score += 1
    # Deduct for missing optional fields (max -1)
    optional_missing = sum(1 for f in optional if f in missing_set)
    if optional_missing <= 2:
        score += 1

    return min(int((score / 10) * 100), 99)  # Never show 100% until explicitly generated
