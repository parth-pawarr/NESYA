"""
NESYA ORM Models — Conversations & Messages

Persists AI chat sessions and individual messages to PostgreSQL.
Links to the existing in-memory session system via ``session_id``.
"""
import enum
import uuid

from sqlalchemy import (
    Column, DateTime, Enum as SAEnum, ForeignKey, Index, Integer,
    JSON, String, Text,
)
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_user_id", "user_id"),
        Index("ix_conversations_status", "status"),
        Index("ix_conversations_created_at", "created_at"),
        Index("ix_conversations_session_id", "session_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Cross-reference to the in-memory NLP session
    session_id = Column(String(255), nullable=True)
    title = Column(String(500), nullable=True)
    status = Column(
        SAEnum(ConversationStatus, name="conversationstatus"),
        default=ConversationStatus.ACTIVE,
        nullable=False,
    )
    completion_percentage = Column(Integer, default=0, nullable=False)
    police_station = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
        lazy="select",
    )
    fir_report = relationship(
        "FIRReport", back_populates="conversation", uselist=False, lazy="select"
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_id", "conversation_id"),
        Index("ix_messages_created_at", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(SAEnum(MessageRole, name="messagerole"), nullable=False)
    content = Column(Text, nullable=False)
    # Stores suggested_replies, missing_fields, etc.
    meta = Column("metadata", JSON, nullable=True)
    token_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
