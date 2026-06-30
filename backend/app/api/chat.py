"""
API Router — all FIR Chat endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.schemas import (
    ChatRequest, ChatResponse,
    AnalyzeRequest, AnalyzeResponse,
    GenerateFIRRequest,
    ResetRequest, ResetResponse,
)
from app.services.conversation_service import (
    process_message,
    start_session,
    generate_fir_for_session,
    reset_session,
)
from app.services.fir_service import analyze_narrative, get_missing_fields, compute_completion_percentage
from app.models.session import get_session, list_sessions

router = APIRouter(prefix="/api/v1", tags=["FIR Chat"])


@router.get("/health")
async def health_check():
    """API health check."""
    return {"status": "ok", "service": "NESYA FIR Assistant"}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main conversational endpoint.

    Accepts a user message and optionally a session_id.
    Runs the NLP pipeline, detects missing fields, and returns the
    assistant's next question or the completed FIR.
    """
    # Handle "generate" command
    if request.message.strip().lower() in ("generate", "generate fir", "yes", "proceed"):
        result = generate_fir_for_session(
            session_id=request.session_id,
            complainant_name=request.complainant_name,
            complainant_contact=request.complainant_contact,
            police_station=request.police_station,
        )
        return result

    return process_message(
        message=request.message,
        session_id=request.session_id,
        complainant_name=request.complainant_name,
        complainant_contact=request.complainant_contact,
        police_station=request.police_station,
    )


@router.post("/start", response_model=ChatResponse)
async def start_new_session(session_id: str = None):
    """
    Start a new conversation session and receive the welcome message.
    """
    return start_session(session_id)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Run the NLP + Rule Engine pipeline on a given narrative without
    maintaining conversation state. Useful for direct analysis.
    """
    result = analyze_narrative(request.narrative)
    if not result["success"]:
        raise HTTPException(status_code=422, detail=result["error"])

    nlp = result["nlp_result"]
    rule = result["rule_result"]
    missing = get_missing_fields(nlp)
    completion = compute_completion_percentage(nlp, rule)

    return AnalyzeResponse(
        session_id=request.session_id or "no-session",
        nlp_result=nlp,
        rule_result=rule,
        missing_fields=missing,
        completion_percentage=completion,
    )


@router.post("/generate-fir", response_model=ChatResponse)
async def generate_fir(request: GenerateFIRRequest):
    """
    Force-generate the FIR for a session with any additional metadata.
    """
    result = generate_fir_for_session(
        session_id=request.session_id,
        complainant_name=request.complainant_name,
        complainant_contact=request.complainant_contact,
        police_station=request.police_station,
    )
    if result.status == "error":
        raise HTTPException(status_code=404, detail=result.message)
    return result


@router.get("/conversation/{session_id}")
async def get_conversation(session_id: str):
    """
    Retrieve the full conversation history for a session.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "conversation": session.get_conversation_dicts(),
        "is_complete": session.is_complete,
        "missing_fields": session.missing_fields,
        "complainant_name": session.complainant_name,
        "police_station": session.police_station,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }


@router.get("/conversations")
async def get_all_conversations():
    """List all active conversation sessions."""
    return {"sessions": list_sessions()}


@router.post("/reset", response_model=ResetResponse)
async def reset(request: ResetRequest):
    """
    Clear/delete a session entirely.
    """
    success = reset_session(request.session_id)
    return ResetResponse(
        success=success,
        message="Session cleared." if success else "Session not found."
    )
