"""
Tests for FIR NLP extraction system.
Run with:  python -m pytest tests/ -v   (from fir_nlp/)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fir_extractor import extract_fir
from tests.sample_narratives import NARRATIVES


def _run(key):
    return extract_fir(NARRATIVES[key])


# ── Chain snatching ───────────────────────────────────────────────────────────
def test_chain_snatching_primary_action():
    r = _run("chain_snatching")
    assert r["INCIDENT"]["primary_action"] == "snatching"

def test_chain_snatching_verb():
    r = _run("chain_snatching")
    assert "snatched" in r["INCIDENT"]["action_verbs"]

def test_chain_snatching_no_violence():
    r = _run("chain_snatching")
    assert r["INCIDENT"]["violence_involved"] is False

def test_chain_snatching_property():
    r = _run("chain_snatching")
    assert r["PROPERTY"]["property_involved"] is True
    assert "gold" in r["PROPERTY"]["property_items"]

def test_chain_snatching_amount():
    r = _run("chain_snatching")
    assert r["PROPERTY"]["financial_amount"] is not None
    assert "45,000" in r["PROPERTY"]["financial_amount"]

def test_chain_snatching_location_type():
    r = _run("chain_snatching")
    assert r["LOCATION_AND_TIME"]["location_type"] == "public"

def test_chain_snatching_date():
    r = _run("chain_snatching")
    assert "15" in (r["LOCATION_AND_TIME"]["date"] or "")

def test_chain_snatching_time_of_day():
    r = _run("chain_snatching")
    assert r["LOCATION_AND_TIME"]["time_of_day"] == "night"

def test_chain_snatching_witness():
    r = _run("chain_snatching")
    assert len(r["PEOPLE"]["witnesses"]) >= 1 or \
           "Ramesh Patil" in str(r["PEOPLE"]["third_parties"])

def test_chain_snatching_unknown_accused():
    r = _run("chain_snatching")
    assert "unknown" in r["PEOPLE"]["accused"].lower()

# ── Domestic violence ─────────────────────────────────────────────────────────
def test_domestic_violence_primary_action():
    r = _run("domestic_violence")
    assert r["INCIDENT"]["primary_action"] == "assault"

def test_domestic_violence_violence():
    r = _run("domestic_violence")
    assert r["INCIDENT"]["violence_involved"] is True

def test_domestic_violence_weapon():
    r = _run("domestic_violence")
    assert r["INCIDENT"]["weapon_used"] in {"rod", "iron rod"}

def test_domestic_violence_threat():
    r = _run("domestic_violence")
    assert r["INCIDENT"]["threat_made"] is True

def test_domestic_violence_accused_known():
    r = _run("domestic_violence")
    assert r["CONSENT_AND_INTENT"]["accused_known_to_victim"] is True

def test_domestic_violence_time_of_day():
    r = _run("domestic_violence")
    assert r["LOCATION_AND_TIME"]["time_of_day"] == "night"

# ── Online fraud ──────────────────────────────────────────────────────────────
def test_online_fraud_primary_action():
    r = _run("online_fraud")
    assert "fraud" in r["INCIDENT"]["primary_action"] or \
           "cheating" in r["INCIDENT"]["primary_action"]

def test_online_fraud_location_type():
    r = _run("online_fraud")
    assert r["LOCATION_AND_TIME"]["location_type"] == "online"

def test_online_fraud_financial_loss():
    r = _run("online_fraud")
    assert r["PROPERTY"]["financial_loss"] is True

def test_online_fraud_amount():
    r = _run("online_fraud")
    assert r["PROPERTY"]["financial_amount"] is not None

def test_online_fraud_no_violence():
    r = _run("online_fraud")
    assert r["INCIDENT"]["violence_involved"] is False


def test_witness_named_phrase():
    r = _run("witness_named_phrase")
    assert "Amit Verma" in r["PEOPLE"]["witnesses"]


def test_confidence_is_float():
    for key in NARRATIVES:
        r = _run(key)
        c = r["CONFIDENCE"]["extraction_confidence"]
        assert isinstance(c, float)
        assert 0.0 <= c <= 1.0

def test_missing_fields_is_list():
    for key in NARRATIVES:
        r = _run(key)
        assert isinstance(r["MISSING_INFORMATION"]["missing_fields"], list)
