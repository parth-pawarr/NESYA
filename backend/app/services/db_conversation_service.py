"""
NESYA — Async DB service for persisted conversation + message management.

All public functions enforce user-ownership by always filtering on user_id,
so one user can never access another's conversations.
"""
from __future__ import annotations

import math
import uuid
from typing import Optional, Any
from uuid import UUID

from sqlalchemy import select, func, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message, ConversationStatus, MessageRole
from app.schemas.conversation import (
    ConversationListItem,
    ConversationDetail,
    ConversationListResponse,
    MessageOut,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _auto_title(first_user_message: str) -> str:
    """Generate a short conversation title from the first user message."""
    cleaned = first_user_message.strip()
    if len(cleaned) <= 60:
        return cleaned
    # Trim at the last word boundary before 60 chars
    trimmed = cleaned[:60]
    last_space = trimmed.rfind(" ")
    return (trimmed[:last_space] if last_space > 30 else trimmed) + "…"


def _preview_from_messages(messages: list[Message]) -> str | None:
    """Return a preview string from the first user message in a conversation."""
    for msg in messages:
        if msg.role == MessageRole.USER:
            content = msg.content.strip()
            return content[:80] + "…" if len(content) > 80 else content
    return None


def _serialize_conversation(conv: Conversation, message_count: int = 0) -> ConversationListItem:
    """Convert a Conversation ORM row to a sidebar list item."""
    preview: str | None = None
    if conv.messages:
        preview = _preview_from_messages(conv.messages)

    return ConversationListItem(
        id=conv.id,
        title=conv.title,
        status=conv.status.value if hasattr(conv.status, "value") else conv.status,
        completion_percentage=conv.completion_percentage,
        message_count=message_count,
        preview=preview,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


# ── Create ─────────────────────────────────────────────────────────────────────

async def create_conversation(
    db: AsyncSession,
    user_id: UUID,
    session_id: str,
    title: str | None = None,
) -> Conversation:
    """Create and persist a new Conversation row linked to the given user."""
    conv = Conversation(
        id=uuid.uuid4(),
        user_id=user_id,
        session_id=session_id,
        title=title,
        status=ConversationStatus.ACTIVE,
        completion_percentage=0,
    )
    db.add(conv)
    await db.flush()   # get the PK without committing yet
    return conv


# ── Read ───────────────────────────────────────────────────────────────────────

async def get_user_conversations(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    limit: int = 20,
    status_filter: str | None = None,
) -> ConversationListResponse:
    """
    Return a paginated list of conversations belonging to user_id.
    Ordered by updated_at DESC (most recent first).
    """
    offset = (page - 1) * limit

    # Count total
    count_q = select(func.count()).select_from(Conversation).where(
        Conversation.user_id == user_id
    )
    if status_filter:
        count_q = count_q.where(Conversation.status == status_filter)
    total: int = (await db.execute(count_q)).scalar_one()

    # Fetch page
    q = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .options(selectinload(Conversation.messages))
    )
    if status_filter:
        q = q.where(Conversation.status == status_filter)

    rows = (await db.execute(q)).scalars().all()

    # Get message counts in one query
    count_rows = await db.execute(
        select(Message.conversation_id, func.count(Message.id).label("cnt"))
        .where(Message.conversation_id.in_([r.id for r in rows]))
        .group_by(Message.conversation_id)
    )
    msg_counts: dict[UUID, int] = {row.conversation_id: row.cnt for row in count_rows}

    items = [_serialize_conversation(r, msg_counts.get(r.id, 0)) for r in rows]

    return ConversationListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=(offset + len(items)) < total,
    )


async def get_conversation_by_id(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> Conversation | None:
    """
    Fetch a single conversation with its messages.
    Returns None if not found OR if it doesn't belong to user_id (ownership check).
    """
    q = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,   # ownership enforced
        )
        .options(selectinload(Conversation.messages))
    )
    return (await db.execute(q)).scalar_one_or_none()


async def get_conversation_by_session_id(
    db: AsyncSession,
    session_id: str,
    user_id: UUID,
) -> Conversation | None:
    """Look up a conversation by its NLP session_id (for the chat endpoint)."""
    q = select(Conversation).where(
        Conversation.session_id == session_id,
        Conversation.user_id == user_id,
    )
    return (await db.execute(q)).scalar_one_or_none()


async def get_conversation_detail(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> ConversationDetail | None:
    """Full conversation detail including all messages, for the client to render."""
    conv = await get_conversation_by_id(db, conversation_id, user_id)
    if not conv:
        return None

    messages = [
        MessageOut(
            id=m.id,
            role=m.role.value if hasattr(m.role, "value") else m.role,
            content=m.content,
            meta=m.meta,
            created_at=m.created_at,
        )
        for m in conv.messages
    ]

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        status=conv.status.value if hasattr(conv.status, "value") else conv.status,
        completion_percentage=conv.completion_percentage,
        session_id=conv.session_id,
        police_station=conv.police_station,
        messages=messages,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


# ── Write messages ─────────────────────────────────────────────────────────────

async def save_message(
    db: AsyncSession,
    conversation_id: UUID,
    role: str,              # "user" | "assistant" | "system"
    content: str,
    meta: dict[str, Any] | None = None,
    token_count: int | None = None,
) -> Message:
    """Persist one message and return the ORM row."""
    role_enum = MessageRole(role)
    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        role=role_enum,
        content=content,
        meta=meta,
        token_count=token_count,
    )
    db.add(msg)
    await db.flush()
    return msg


async def save_message_pair(
    db: AsyncSession,
    conversation_id: UUID,
    user_content: str,
    assistant_content: str,
    assistant_meta: dict[str, Any] | None = None,
) -> tuple[Message, Message]:
    """Save a user message and the corresponding assistant reply in one call."""
    user_msg = await save_message(db, conversation_id, "user", user_content)
    asst_msg = await save_message(
        db, conversation_id, "assistant", assistant_content, meta=assistant_meta
    )
    return user_msg, asst_msg


# ── Update ─────────────────────────────────────────────────────────────────────

async def update_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
    title: str | None = None,
    status: str | None = None,
    completion_percentage: int | None = None,
) -> Conversation | None:
    """
    Rename, archive, or update the completion of a conversation.
    Returns None if conversation doesn't exist or belongs to a different user.
    """
    conv = await get_conversation_by_id(db, conversation_id, user_id)
    if not conv:
        return None

    if title is not None:
        conv.title = title
    if status is not None:
        conv.status = ConversationStatus(status)
    if completion_percentage is not None:
        conv.completion_percentage = completion_percentage

    db.add(conv)
    await db.flush()
    return conv


async def set_conversation_title_if_empty(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
    first_user_message: str,
) -> None:
    """Auto-set the title from the first user message if no title exists yet."""
    conv = await get_conversation_by_id(db, conversation_id, user_id)
    if conv and not conv.title:
        conv.title = _auto_title(first_user_message)
        db.add(conv)
        await db.flush()


# ── Delete ─────────────────────────────────────────────────────────────────────

async def delete_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Hard-delete a conversation and all its messages (cascade).
    Returns True if deleted, False if not found or not owned by user.
    """
    # Verify ownership first
    conv = (
        await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
    ).scalar_one_or_none()

    if not conv:
        return False

    await db.delete(conv)
    await db.flush()
    return True


# ── Search ─────────────────────────────────────────────────────────────────────

async def search_conversations(
    db: AsyncSession,
    user_id: UUID,
    query: str,
    limit: int = 20,
) -> list[ConversationListItem]:
    """
    Search conversations by title or message content.
    Uses ILIKE for case-insensitive partial matching (works on PostgreSQL).
    """
    pattern = f"%{query}%"

    # Conversations whose title matches
    title_q = (
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.title.ilike(pattern),
        )
        .options(selectinload(Conversation.messages))
        .limit(limit)
    )
    title_matches = (await db.execute(title_q)).scalars().all()
    matched_ids = {c.id for c in title_matches}

    # Conversations that contain a matching message (exclude already found)
    msg_subq = (
        select(Message.conversation_id)
        .where(Message.content.ilike(pattern))
        .distinct()
        .scalar_subquery()
    )
    content_q = (
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.id.in_(msg_subq),
            ~Conversation.id.in_(matched_ids) if matched_ids else True,
        )
        .options(selectinload(Conversation.messages))
        .limit(limit - len(title_matches))
    )
    content_matches = (await db.execute(content_q)).scalars().all()

    all_convs = list(title_matches) + list(content_matches)
    return [_serialize_conversation(c) for c in all_convs]
