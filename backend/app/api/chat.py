"""
NESYA — Chat & Conversation Router  /api/v1/
All chat endpoints now require JWT authentication.
Messages are persisted to PostgreSQL on every turn.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas import (
    ChatRequest, ChatResponse,
    AnalyzeRequest, AnalyzeResponse,
    GenerateFIRRequest,
    ResetRequest, ResetResponse,
)
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationDetail,
    ConversationListResponse,
    ConversationSearchRequest,
    ConversationUpdateRequest,
)
from app.services import db_conversation_service as db_svc
from app.services.conversation_service import (
    process_message,
    start_session,
    generate_fir_for_session,
    reset_session,
)
from app.services.fir_service import analyze_narrative, get_missing_fields, compute_completion_percentage
from app.models.session import get_session, list_sessions

router = APIRouter(prefix="/api/v1", tags=["FIR Chat"])


# ── Health ────────────────────────────────────────────────────────────────────
@router.get("/health")
async def health_check():
    """API health check (no auth required)."""
    return {"status": "ok", "service": "NESYA FIR Assistant"}


# ── Start / Create conversation ───────────────────────────────────────────────
@router.post("/start", response_model=ChatResponse)
async def start_new_session(
    body: ConversationCreateRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new NLP session AND a corresponding DB conversation row.
    Returns the welcome message.
    """
    session_id: str | None = body.session_id if body else None
    chat_resp = start_session(session_id)

    # Persist the conversation to DB
    conv = await db_svc.create_conversation(
        db,
        user_id=current_user.id,
        session_id=chat_resp.session_id,
        title=body.title if body else None,
    )
    # Save the welcome (assistant) message
    await db_svc.save_message(
        db,
        conversation_id=conv.id,
        role="assistant",
        content=chat_resp.message,
    )

    return chat_resp


# ── Chat (main conversational endpoint) ──────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Main conversational endpoint — authenticated + DB-persisted.

    Accepts a user message and optionally a session_id.
    Runs the NLP pipeline, saves both user msg + AI reply to DB,
    and returns the assistant's next question or the completed FIR.
    """
    # Resolve (or create) the DB conversation for this session
    conv = None
    if request.session_id:
        conv = await db_svc.get_conversation_by_session_id(
            db, request.session_id, current_user.id
        )

    # If no DB conversation exists yet, create one on-the-fly
    if conv is None:
        import uuid as _uuid
        sid = request.session_id or str(_uuid.uuid4())
        conv = await db_svc.create_conversation(
            db,
            user_id=current_user.id,
            session_id=sid,
        )

    # Handle "generate" command
    if request.message.strip().lower() in ("generate", "generate fir", "yes", "proceed"):
        result = generate_fir_for_session(
            session_id=conv.session_id,
            complainant_name=request.complainant_name,
            complainant_contact=request.complainant_contact,
            police_station=request.police_station,
        )
        # Persist the assistant reply
        meta = {"fir_data": result.fir_data.model_dump() if result.fir_data else None}
        await db_svc.save_message_pair(
            db, conv.id,
            user_content=request.message,
            assistant_content=result.message,
            assistant_meta=meta,
        )
        await db_svc.update_conversation(
            db, conv.id, current_user.id,
            completion_percentage=100,
            status="completed",
        )
        return result

    # Regular message processing
    result = process_message(
        message=request.message,
        session_id=conv.session_id,
        complainant_name=request.complainant_name,
        complainant_contact=request.complainant_contact,
        police_station=request.police_station,
    )

    # Persist user + assistant messages
    meta = {
        "missing_fields": result.missing_fields,
        "completion_percentage": result.completion_percentage,
        "suggested_replies": result.suggested_replies,
    }
    if result.fir_data:
        meta["fir_data"] = result.fir_data.model_dump()

    await db_svc.save_message_pair(
        db, conv.id,
        user_content=request.message,
        assistant_content=result.message,
        assistant_meta=meta,
    )

    # Auto-set conversation title from first user message
    await db_svc.set_conversation_title_if_empty(
        db, conv.id, current_user.id, request.message
    )

    # Update completion percentage on the conversation row
    if result.completion_percentage > 0 or result.status == "fir_ready":
        new_status = "completed" if result.status == "fir_ready" else "active"
        await db_svc.update_conversation(
            db, conv.id, current_user.id,
            completion_percentage=result.completion_percentage,
            status=new_status,
        )

    return result


# ── FIR Generation ────────────────────────────────────────────────────────────
@router.post("/generate-fir", response_model=ChatResponse)
async def generate_fir(
    request: GenerateFIRRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Force-generate the FIR for a session with additional metadata."""
    result = generate_fir_for_session(
        session_id=request.session_id,
        complainant_name=request.complainant_name,
        complainant_contact=request.complainant_contact,
        police_station=request.police_station,
    )
    if result.status == "error":
        raise HTTPException(status_code=404, detail=result.message)

    # Persist and mark conversation complete
    conv = await db_svc.get_conversation_by_session_id(
        db, request.session_id, current_user.id
    )
    if conv:
        meta = {"fir_data": result.fir_data.model_dump() if result.fir_data else None}
        await db_svc.save_message(
            db, conv.id, "assistant", result.message, meta=meta
        )
        await db_svc.update_conversation(
            db, conv.id, current_user.id,
            completion_percentage=100,
            status="completed",
        )

    return result


# ── Analyze (stateless) ───────────────────────────────────────────────────────
@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    """Run NLP + Rule Engine on a narrative without maintaining session state."""
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


# ── Reset session (in-memory only) ───────────────────────────────────────────
@router.post("/reset", response_model=ResetResponse)
async def reset(
    request: ResetRequest,
    current_user: User = Depends(get_current_user),
):
    """Clear/delete the in-memory NLP session (DB record is kept)."""
    success = reset_session(request.session_id)
    return ResetResponse(
        success=success,
        message="Session cleared." if success else "Session not found."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Persistent Conversation CRUD  (DB-backed, user-isolated)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/conversations", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new blank conversation (DB record). Then call /start for the NLP session."""
    import uuid as _uuid
    sid = body.session_id or str(_uuid.uuid4())

    conv = await db_svc.create_conversation(
        db,
        user_id=current_user.id,
        session_id=sid,
        title=body.title,
    )
    detail = await db_svc.get_conversation_detail(db, conv.id, current_user.id)
    if not detail:
        raise HTTPException(status_code=500, detail="Failed to create conversation.")
    return detail


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the authenticated user's conversations, paginated and sorted by
    most recently updated. Optionally filter by status (active/completed/archived).
    """
    return await db_svc.get_user_conversations(
        db,
        user_id=current_user.id,
        page=page,
        limit=limit,
        status_filter=status_filter,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a single conversation with its full message history."""
    detail = await db_svc.get_conversation_detail(db, conversation_id, current_user.id)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return detail


@router.patch("/conversations/{conversation_id}", response_model=ConversationDetail)
async def update_conversation(
    conversation_id: UUID,
    body: ConversationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename or archive a conversation."""
    conv = await db_svc.update_conversation(
        db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        title=body.title,
        status=body.status,
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    detail = await db_svc.get_conversation_detail(db, conversation_id, current_user.id)
    return detail


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a conversation and all its messages."""
    deleted = await db_svc.delete_conversation(db, conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found.")


@router.post("/conversations/search", response_model=list[ConversationDetail])
async def search_conversations(
    body: ConversationSearchRequest,
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search the authenticated user's conversations by title or message content."""
    results = await db_svc.search_conversations(
        db,
        user_id=current_user.id,
        query=body.query,
        limit=limit,
    )
    return results
