import sys
import argparse
import json
from pathlib import Path

# Add NLP_Pipeline and Rule_Engine to Python's module search path
root_dir = Path(__file__).resolve().parent
sys.path.append(str(root_dir / "NLP_Pipeline"))
sys.path.append(str(root_dir / "Rule_Engine"))

try:
    from fir_extractor import extract_fir
    from bns_rule_engine import BNSRuleEngine
except ImportError as e:
    print(f"Error importing modules: {e}", file=sys.stderr)
    print("Please make sure you run the script from the project root directory.", file=sys.stderr)
    sys.exit(1)


def print_summary(nlp_out: dict, rule_out: dict) -> None:
    """Prints a beautiful summary of the NLP extraction and Rule Engine analysis."""
    print("=" * 70)
    print("                NESYA AI: LAW ENFORCEMENT FIR ASSISTANT                ")
    print("=" * 70)
    print(f"Processing Status:   {rule_out['processing_status'].upper()}")
    print(f"Recommended Action:  {rule_out['recommended_action']}")
    print(f"Overall Confidence:  {rule_out['overall_confidence']}")
    print("-" * 70)

    # NLP Extracted Facts
    people = nlp_out.get("PEOPLE", {})
    incident = nlp_out.get("INCIDENT", {})
    prop = nlp_out.get("PROPERTY", {})
    loc = nlp_out.get("LOCATION_AND_TIME", {})

    print("EXTRACTED NLP ENTITIES:")
    print(f"  Victim:       {people.get('victim')}")
    print(f"  Accused:      {people.get('accused')}")
    print(f"  Witnesses:    {', '.join(people.get('witnesses', [])) or 'None'}")
    print(f"  Location:     {loc.get('location')} ({loc.get('location_type')})")
    print(f"  Date & Time:  {loc.get('date')} at {loc.get('time')}")
    print(f"  Property:     {prop.get('property_items')} (Value: {prop.get('financial_amount') or 'N/A'})")
    print(f"  Violence/Weap: {'Yes' if incident.get('violence_involved') else 'No'} / {incident.get('weapon_used') or 'None'}")

    print("-" * 70)
    # Primary Legal Assessment
    primary = rule_out.get("primary_section")
    if primary:
        print("PRIMARY LEGAL CLASSIFICATION:")
        print(f"  Section:      {primary['section_id']} - {primary['title']}")
        print(f"  Confidence:   {primary['confidence']}")
        print(f"  Punishment:   {primary['punishment']}")
        print(f"  Explanation:  {primary['explanation']}")
    else:
        print("PRIMARY LEGAL CLASSIFICATION: None (Insufficient Data)")

    # Alternative Sections
    alts = rule_out.get("alternative_sections", [])
    if alts:
        print("-" * 70)
        print(f"ALTERNATIVE CLASSIFICATIONS ({len(alts)}):")
        for idx, alt in enumerate(alts, 1):
            print(f"  {idx}. {alt['section_id']} - {alt['title']} (Confidence: {alt['confidence']})")

    # Missing fields and clarification questions
    questions = rule_out.get("clarification_questions", [])
    if questions:
        print("-" * 70)
        print("REQUIRED CLARIFICATION QUESTIONS:")
        for idx, q in enumerate(questions, 1):
            print(f"  {idx}. [{q['section_id'].upper()}] ({q['priority'].upper()}) {q['missing_field']}: {q['question']}")

    # Quality and Audit Flags
    flags = rule_out.get("fir_quality_flags", [])
    if flags:
        print("-" * 70)
        print("FIR QUALITY AUDIT FLAGS:")
        for idx, f in enumerate(flags, 1):
            print(f"  {idx}. [{f['flag_type'].upper()}] {f['description']}")
            print(f"     Recommendation: {f['recommendation']}")

    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="End-to-end Legal NLP Extractor and BNS Rule Engine CLI Tool."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", type=str, help="Raw complaint narrative text")
    group.add_argument("--file", type=Path, help="Path to text file containing narrative")
    parser.add_argument(
        "--output", type=Path, default=None,
        help="Path to write the combined JSON output result"
    )
    args = parser.parse_args()

    # 1. Read input text
    if args.file:
        try:
            narrative = args.file.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        narrative = args.text

    if not narrative.strip():
        print("Error: Input narrative is empty.", file=sys.stderr)
        sys.exit(1)

    # 2. Run NLP Extraction pipeline
    try:
        nlp_result = extract_fir(narrative)
    except Exception as e:
        print(f"Error in NLP pipeline extraction: {e}", file=sys.stderr)
        sys.exit(1)

    # 3. Run BNS Rule Engine inference
    try:
        engine = BNSRuleEngine()
        rule_result = engine.infer(nlp_result)
    except Exception as e:
        print(f"Error in Rule Engine inference: {e}", file=sys.stderr)
        sys.exit(1)

    # 4. Print formatted summary to stdout
    print_summary(nlp_result, rule_result)

    # 5. Optionally output combined JSON
    if args.output:
        combined_result = {
            "raw_narrative": narrative,
            "nlp_extraction": nlp_result,
            "bns_analysis": rule_result
        }
        try:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(
                json.dumps(combined_result, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
            print(f"✓ Combined analysis output written to: {args.output}")
        except Exception as e:
            print(f"Error writing output file: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
