"""
FIR Formatter — converts NLP + Rule Engine output into a structured FIR document.
"""
from datetime import datetime
import uuid


def format_fir_document(
    nlp_result: dict,
    rule_result: dict,
    complainant_name: str = "Not Provided",
    complainant_contact: str = "Not Provided",
    police_station: str = "Not Specified",
    fir_number: str = None
) -> dict:
    """
    Produce a clean, structured FIR document dict from raw pipeline outputs.
    Does NOT modify any pipeline logic — purely formats for display.
    """
    fir_number = fir_number or f"FIR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    date_of_report = datetime.utcnow().strftime("%d %B %Y, %H:%M UTC")

    people = nlp_result.get("PEOPLE", {})
    incident = nlp_result.get("INCIDENT", {})
    prop = nlp_result.get("PROPERTY", {})
    loc = nlp_result.get("LOCATION_AND_TIME", {})
    confidence_data = nlp_result.get("CONFIDENCE", {})

    primary_section = rule_result.get("primary_section")
    crime_type = (
        primary_section.get("title", "Unknown")
        if primary_section
        else incident.get("primary_action", "Unknown").title()
    )

    # Build a readable description
    description_parts = []
    victim = people.get("victim", "The complainant")
    accused = people.get("accused", "unknown person(s)")
    location = loc.get("location") or "an unspecified location"
    date = loc.get("date") or "an unspecified date"
    time = loc.get("time") or "an unspecified time"
    action = incident.get("primary_action", "committed an offence")

    description_parts.append(
        f"The complainant {complainant_name} states that on {date} at approximately {time}, "
        f"the incident of {action} occurred at {location}."
    )

    if incident.get("violence_involved"):
        weapon = incident.get("weapon_used")
        weapon_str = f" using {weapon}" if weapon else ""
        description_parts.append(f"Violence was involved{weapon_str}.")

    if incident.get("threat_made"):
        description_parts.append("Threats were made during the incident.")

    if prop.get("property_involved"):
        items = prop.get("property_items", [])
        amount = prop.get("financial_amount")
        items_str = ", ".join(items) if items else "unspecified property"
        amount_str = f" valued at {amount}" if amount else ""
        description_parts.append(f"Property stolen/damaged: {items_str}{amount_str}.")

    full_description = " ".join(description_parts)

    # Legal sections
    legal_sections = []
    if primary_section:
        legal_sections.append({
            "section_id": primary_section.get("section_id", ""),
            "title": primary_section.get("title", ""),
            "confidence": primary_section.get("confidence", 0),
            "explanation": primary_section.get("explanation", ""),
            "punishment": primary_section.get("punishment", ""),
        })
    for alt in rule_result.get("alternative_sections", [])[:3]:
        legal_sections.append({
            "section_id": alt.get("section_id", ""),
            "title": alt.get("title", ""),
            "confidence": alt.get("confidence", 0),
            "explanation": alt.get("explanation", ""),
            "punishment": alt.get("punishment", ""),
        })

    return {
        "fir_number": fir_number,
        "date_of_report": date_of_report,
        "complainant_name": complainant_name,
        "complainant_contact": complainant_contact,
        "police_station": police_station,
        "victim": victim,
        "accused_details": accused,
        "incident_date": date,
        "incident_time": time,
        "incident_location": location,
        "location_type": loc.get("location_type", "unknown"),
        "crime_type": crime_type,
        "description": full_description,
        "witness_details": people.get("witnesses", []),
        "property_details": prop.get("property_items", []),
        "financial_loss": prop.get("financial_amount"),
        "legal_sections": legal_sections,
        "quality_flags": rule_result.get("fir_quality_flags", []),
        "overall_confidence": confidence_data.get("extraction_confidence", 0.0),
        "processing_status": rule_result.get("processing_status", "unknown"),
        "recommended_action": rule_result.get("recommended_action", ""),
        "raw_nlp": nlp_result,
        "raw_rule_engine": rule_result,
    }


def format_fir_as_text(fir: dict) -> str:
    """
    Render a plain-text version of the FIR for copy/display.
    """
    lines = [
        "=" * 65,
        "           FIRST INFORMATION REPORT (FIR)           ",
        "=" * 65,
        f"  FIR Number:         {fir.get('fir_number', 'N/A')}",
        f"  Date of Report:     {fir.get('date_of_report', 'N/A')}",
        f"  Police Station:     {fir.get('police_station', 'N/A')}",
        "-" * 65,
        "COMPLAINANT DETAILS",
        f"  Name:               {fir.get('complainant_name', 'N/A')}",
        f"  Contact:            {fir.get('complainant_contact', 'N/A')}",
        "-" * 65,
        "INCIDENT DETAILS",
        f"  Crime Type:         {fir.get('crime_type', 'N/A')}",
        f"  Date of Incident:   {fir.get('incident_date', 'N/A')}",
        f"  Time of Incident:   {fir.get('incident_time', 'N/A')}",
        f"  Location:           {fir.get('incident_location', 'N/A')} ({fir.get('location_type', 'unknown')})",
        f"  Accused:            {fir.get('accused_details', 'N/A')}",
        "-" * 65,
        "DESCRIPTION OF INCIDENT",
        "",
        fir.get("description", ""),
        "",
        "-" * 65,
    ]

    witnesses = fir.get("witness_details", [])
    if witnesses:
        lines += ["WITNESS DETAILS", *[f"  - {w}" for w in witnesses], ""]

    property_items = fir.get("property_details", [])
    if property_items:
        amount_str = f" (Value: {fir['financial_loss']})" if fir.get("financial_loss") else ""
        lines += [f"PROPERTY INVOLVED: {', '.join(property_items)}{amount_str}", ""]

    lines += ["-" * 65, "LEGAL SECTIONS APPLICABLE"]
    for sec in fir.get("legal_sections", []):
        lines += [
            f"  {sec['section_id']} — {sec['title']} (Confidence: {sec['confidence']})",
            f"  Punishment: {sec.get('punishment', 'N/A')}",
            f"  {sec.get('explanation', '')}",
            "",
        ]

    lines += [
        "-" * 65,
        f"Overall Confidence Score: {fir.get('overall_confidence', 0.0)}",
        f"Recommended Action: {fir.get('recommended_action', 'N/A')}",
        "=" * 65,
        "Generated by NESYA AI — FIR Legal Assistant",
        "=" * 65,
    ]

    return "\n".join(lines)
