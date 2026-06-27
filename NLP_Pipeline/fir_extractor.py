"""
fir_extractor.py
Main entry point — orchestrates all sub-extractors and returns
a single structured JSON-serialisable dict.

Usage (as a library):
    from fir_extractor import extract_fir
    result = extract_fir(narrative_text)
    print(json.dumps(result, indent=2))

Usage (CLI):
    python fir_extractor.py --text "On 15th June 2024, at around 9 PM..."
    python fir_extractor.py --file sample_fir.txt
"""

import json
import sys
import argparse
from pathlib import Path

import spacy

from utils.preprocessing import build_nlp
from extractors.people import extract_people
from extractors.incident import extract_incident
from extractors.property import extract_property
from extractors.location_time import extract_location_time
from extractors.meta import compute_missing_and_confidence


def extract_fir(narrative: str) -> dict:
    """
    Master extraction function.

    Parameters
    ----------
    narrative : str
        Raw FIR complaint narrative text.

    Returns
    -------
    dict
        Fully structured extraction result matching the schema.
    """
    nlp = build_nlp()
    doc = nlp(narrative)

    # ── Run each extractor ────────────────────────────────────────────────────
    people   = extract_people(doc, narrative)
    incident = extract_incident(doc, narrative)
    prop     = extract_property(doc, narrative)
    loc_time = extract_location_time(doc, narrative)

    # ── Flatten into a single dict for the meta scorer ────────────────────────
    flat = {
        # people
        "accused":                 people["accused"],
        "witnesses":               people["witnesses"],
        "accused_known_to_victim": people["_accused_known_to_victim"],
        # incident
        "violence_involved":       incident["violence_involved"],
        # property
        "property_involved":       prop["property_involved"],
        "financial_amount":        prop["financial_amount"],
        # location/time
        "location":                loc_time["location"],
        "date":                    loc_time["date"],
        "time":                    loc_time["time"],
    }

    meta = compute_missing_and_confidence(flat, narrative)

    # ── Assemble final output ─────────────────────────────────────────────────
    return {
        "PEOPLE": {
            "victim":       people["victim"],
            "accused":      people["accused"],
            "witnesses":    people["witnesses"],
            "third_parties": people["third_parties"],
        },
        "INCIDENT": {
            "primary_action":    incident["primary_action"],
            "action_verbs":      incident["action_verbs"],
            "violence_involved": incident["violence_involved"],
            "weapon_used":       incident["weapon_used"],
            "threat_made":       incident["threat_made"],
        },
        "PROPERTY": {
            "property_involved": prop["property_involved"],
            "property_items":    prop["property_items"],
            "property_type":     prop["property_type"],
            "financial_loss":    prop["financial_loss"],
            "financial_amount":  prop["financial_amount"],
        },
        "LOCATION_AND_TIME": {
            "location":      loc_time["location"],
            "location_type": loc_time["location_type"],
            "date":          loc_time["date"],
            "time":          loc_time["time"],
            "time_of_day":   loc_time["time_of_day"],
        },
        "CONSENT_AND_INTENT": {
            "consent_given":           incident["_consent_given"],
            "premeditation":           incident["_premeditation"],
            "accused_known_to_victim": people["_accused_known_to_victim"],
        },
        "MISSING_INFORMATION": {
            "missing_fields": meta["missing_fields"],
        },
        "CONFIDENCE": {
            "extraction_confidence": meta["extraction_confidence"],
            "ambiguous_parts":       meta["ambiguous_parts"],
        },
    }


# ── CLI ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Extract structured entities from an FIR narrative."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", type=str, help="Narrative text as a string")
    group.add_argument("--file", type=Path, help="Path to a .txt file with narrative")
    parser.add_argument(
        "--output", type=Path, default=None,
        help="Optional path to write JSON output (default: stdout)"
    )
    args = parser.parse_args()

    if args.file:
        narrative = args.file.read_text(encoding="utf-8")
    else:
        narrative = args.text

    result = extract_fir(narrative)
    output_json = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        args.output.write_text(output_json, encoding="utf-8")
        print(f"✓ Output written to {args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()
