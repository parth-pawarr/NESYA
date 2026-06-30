"""
Conversation Service — orchestrates the full chat flow.
Manages sessions, runs the NLP pipeline, asks follow-up questions,
and decides when FIR generation is ready.
"""
from app.models.session import Session, get_or_create_session, delete_session
from app.services.fir_service import analyze_narrative, get_missing_fields, compute_completion_percentage
from app.services.question_generator import (
    get_questions_for_missing,
    get_fields_asked_this_turn,
    build_suggested_replies,
)
from app.services.fir_formatter import format_fir_document
from app.schemas import ChatResponse, ConversationMessage

# Mandatory fields required before FIR generation
MANDATORY_FIELDS = {"exact_location", "date_of_incident"}


def _build_welcome_message() -> str:
    return (
        "👋 **Welcome to NESYA — AI Legal FIR Assistant**\n\n"
        "I'm here to help you file a First Information Report (FIR). "
        "Please describe the incident in your own words — what happened, where, and when.\n\n"
        "**Example:** *\"Yesterday around 8 PM, someone stole my bike near the railway station.\"*\n\n"
        "The more detail you provide, the more complete your FIR will be. Let's begin."
    )


def _is_fir_ready(missing_fields: list[str], rule_result: dict) -> bool:
    """
    Decide if we have enough information to generate a final FIR.
    We need at minimum: incident type + location + date.
    """
    missing_set = set(missing_fields)
    # If both critical location and date are present, we can generate
    if "exact_location" not in missing_set and "date_of_incident" not in missing_set:
        return True
    # If the rule engine found a primary section and only optional fields are missing
    primary = rule_result.get("primary_section")
    if primary and primary.get("confidence", 0) >= 0.5:
        # Only non-critical fields missing
        critical_missing = missing_set & {"exact_location", "date_of_incident"}
        if not critical_missing:
            return True
    return False


def process_message(
    message: str,
    session_id: str = None,
    complainant_name: str = None,
    complainant_contact: str = None,
    police_station: str = None,
) -> ChatResponse:
    """
    Main chat processing function. Handles one user turn.
    Returns a ChatResponse with the assistant reply and current state.
    """
    session = get_or_create_session(session_id)

    # Update complainant meta if provided
    if complainant_name:
        session.complainant_name = complainant_name
    if complainant_contact:
        session.complainant_contact = complainant_contact
    if police_station:
        session.police_station = police_station

    # Record user message and append to narrative
    session.add_user_message(message)
    session.append_narrative(message)

    # Run the NLP + Rule Engine pipeline on the full accumulated narrative
    analysis = analyze_narrative(session.full_narrative)

    if not analysis["success"]:
        error_msg = (
            "⚠️ I encountered an issue analyzing your statement. "
            "Could you please rephrase or provide more details about the incident?"
        )
        session.add_assistant_message(error_msg)
        return ChatResponse(
            session_id=session.session_id,
            status="error",
            message=error_msg,
            missing_fields=[],
            completion_percentage=0,
            conversation=[ConversationMessage(**m) for m in session.get_conversation_dicts()],
        )

    nlp_result = analysis["nlp_result"]
    rule_result = analysis["rule_result"]

    # Update session state
    session.last_nlp_result = nlp_result
    session.last_rule_result = rule_result
    session.missing_fields = get_missing_fields(nlp_result)
    session.collected_fields = nlp_result

    completion = compute_completion_percentage(nlp_result, rule_result)
    missing = session.missing_fields

    # Get rule-engine clarification questions
    rule_questions_raw = rule_result.get("clarification_questions", [])

    # Determine if we have enough info
    fir_ready = _is_fir_ready(missing, rule_result)

    if fir_ready or session.is_complete:
        # ── Generate the FIR ──────────────────────────────────────────────────
        session.is_complete = True
        fir_doc = format_fir_document(
            nlp_result=nlp_result,
            rule_result=rule_result,
            complainant_name=session.complainant_name,
            complainant_contact=session.complainant_contact,
            police_station=session.police_station,
        )

        primary = rule_result.get("primary_section")
        crime_name = primary.get("title", "the reported offence") if primary else "the reported offence"
        section_id = primary.get("section_id", "") if primary else ""
        confidence_pct = int((fir_doc.get("overall_confidence", 0)) * 100)

        assistant_msg = (
            f"✅ **Your FIR is ready!**\n\n"
            f"I've successfully compiled all the necessary information. "
            f"Based on your statement, this appears to be a case of **{crime_name}** "
            f"({section_id}) with an extraction confidence of **{confidence_pct}%**.\n\n"
            f"You can review the FIR below. Please verify all details are accurate "
            f"before submission. You can also edit, download as PDF, or export as JSON."
        )

        session.add_assistant_message(assistant_msg)

        return ChatResponse(
            session_id=session.session_id,
            status="fir_ready",
            message=assistant_msg,
            missing_fields=[],
            completion_percentage=100,
            fir_data=fir_doc,
            suggested_replies=["Download PDF", "Export JSON", "Start New FIR"],
            conversation=[ConversationMessage(**m) for m in session.get_conversation_dicts()],
        )

    else:
        # ── Ask follow-up questions ───────────────────────────────────────────
        questions = get_questions_for_missing(
            missing_fields=missing,
            asked_fields=session.asked_fields,
            rule_clarifications=rule_questions_raw,
        )

        # Track what we just asked so we don't repeat
        newly_asked = get_fields_asked_this_turn(
            missing_fields=missing,
            asked_fields=session.asked_fields,
            rule_clarifications=rule_questions_raw,
        )
        session.asked_fields.update(newly_asked)

        # Build assistant reply
        people = nlp_result.get("PEOPLE", {})
        incident = nlp_result.get("INCIDENT", {})
        primary_action = incident.get("primary_action", "unknown")
        loc = nlp_result.get("LOCATION_AND_TIME", {})

        # Compose acknowledgement
        ack_parts = []
        if primary_action != "unknown":
            ack_parts.append(f"I understand this involves **{primary_action}**")
        if loc.get("location"):
            ack_parts.append(f"at **{loc['location']}**")
        if loc.get("date"):
            ack_parts.append(f"on **{loc['date']}**")

        if ack_parts:
            ack = "Thank you for sharing. " + " ".join(ack_parts) + ".\n\n"
        else:
            ack = "Thank you for sharing that information.\n\n"

        if questions:
            if len(questions) == 1:
                follow_up = f"To complete your FIR, I need one more detail:\n\n{questions[0]}"
            else:
                numbered = "\n\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
                follow_up = f"To complete your FIR, I need a few more details:\n\n{numbered}"
        else:
            # All priority fields asked; nudge to finalize
            follow_up = (
                "I now have enough information to generate your FIR. "
                "Would you like to add anything else, or shall I generate the report now?\n\n"
                "Type **\"generate\"** or just press Enter to proceed."
            )
            session.is_complete = True

        assistant_msg = ack + follow_up
        session.add_assistant_message(assistant_msg)

        suggestions = build_suggested_replies(missing, primary_action)

        return ChatResponse(
            session_id=session.session_id,
            status="collecting",
            message=assistant_msg,
            missing_fields=missing,
            completion_percentage=completion,
            suggested_replies=suggestions,
            conversation=[ConversationMessage(**m) for m in session.get_conversation_dicts()],
        )


def start_session(session_id: str = None) -> ChatResponse:
    """Initialize a new session and return the welcome message."""
    session = get_or_create_session(session_id)
    welcome = _build_welcome_message()
    session.add_assistant_message(welcome)

    return ChatResponse(
        session_id=session.session_id,
        status="collecting",
        message=welcome,
        missing_fields=[],
        completion_percentage=0,
        suggested_replies=[
            "My phone was stolen",
            "I was assaulted",
            "Someone cheated me",
            "My bike was stolen",
        ],
        conversation=[ConversationMessage(**m) for m in session.get_conversation_dicts()],
    )


def generate_fir_for_session(
    session_id: str,
    complainant_name: str = None,
    complainant_contact: str = None,
    police_station: str = None,
) -> ChatResponse:
    """Force-generate FIR from current session state."""
    from app.models.session import get_session
    session = get_session(session_id)
    if not session:
        return ChatResponse(
            session_id=session_id,
            status="error",
            message="Session not found. Please start a new conversation.",
            missing_fields=[],
            completion_percentage=0,
        )

    if complainant_name:
        session.complainant_name = complainant_name
    if complainant_contact:
        session.complainant_contact = complainant_contact
    if police_station:
        session.police_station = police_station

    nlp_result = session.last_nlp_result or {}
    rule_result = session.last_rule_result or {}

    if not nlp_result:
        return ChatResponse(
            session_id=session_id,
            status="error",
            message="No narrative has been provided yet. Please describe the incident first.",
            missing_fields=[],
            completion_percentage=0,
        )

    fir_doc = format_fir_document(
        nlp_result=nlp_result,
        rule_result=rule_result,
        complainant_name=session.complainant_name,
        complainant_contact=session.complainant_contact,
        police_station=session.police_station,
    )

    session.is_complete = True
    assistant_msg = "✅ **Your FIR has been generated!** Please review all the details carefully."
    session.add_assistant_message(assistant_msg)

    return ChatResponse(
        session_id=session.session_id,
        status="fir_ready",
        message=assistant_msg,
        missing_fields=[],
        completion_percentage=100,
        fir_data=fir_doc,
        conversation=[ConversationMessage(**m) for m in session.get_conversation_dicts()],
    )


def reset_session(session_id: str) -> bool:
    return delete_session(session_id)
