"""
NESYA — Pydantic schemas for the persistent conversation/history API.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Outbound (response) ────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    """A single persisted message returned to the client."""
    id: UUID
    role: str                          # "user" | "assistant" | "system"
    content: str
    meta: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    """Summary of a conversation shown in the sidebar."""
    id: UUID
    title: Optional[str] = None
    status: str                        # "active" | "completed" | "archived"
    completion_percentage: int
    message_count: int = 0
    preview: Optional[str] = None      # First user message snippet
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    """Full conversation with all messages — used when user opens a chat."""
    id: UUID
    title: Optional[str] = None
    status: str
    completion_percentage: int
    session_id: Optional[str] = None
    police_station: Optional[str] = None
    messages: list[MessageOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    """Paginated wrapper around a list of conversations."""
    items: list[ConversationListItem]
    total: int
    page: int
    limit: int
    has_more: bool


# ── Inbound (request) ─────────────────────────────────────────────────────────

class ConversationCreateRequest(BaseModel):
    """Body for creating a brand-new conversation (session)."""
    title: Optional[str] = Field(None, max_length=500)
    session_id: Optional[str] = Field(None, max_length=255)


class ConversationUpdateRequest(BaseModel):
    """Body for renaming or archiving a conversation."""
    title: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(active|completed|archived)$")


class ConversationSearchRequest(BaseModel):
    """Body for full-text search across a user's conversations."""
    query: str = Field(..., min_length=1, max_length=200)
