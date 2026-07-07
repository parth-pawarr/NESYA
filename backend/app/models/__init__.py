"""
NESYA — ORM model registry.

Import all models here so Alembic can discover them via Base.metadata
and generate accurate migrations (autogenerate).

NOTE: The `session` module is intentionally kept separate — it is the
in-memory chat session store used by the NLP pipeline and is NOT an ORM model.
"""
# ruff: noqa: F401
from app.models.user import User, AuthProvider
from app.models.auth_tokens import (
    RefreshToken,
    EmailVerificationToken,
    PasswordResetToken,
    OAuthAccount,
)
from app.models.conversation import Conversation, Message, ConversationStatus, MessageRole
from app.models.fir import FIRReport, FIRStatus
from app.models.document import UploadedDocument, DocumentStatus
from app.models.audit import AuditLog

__all__ = [
    # User
    "User",
    "AuthProvider",
    # Auth Tokens
    "RefreshToken",
    "EmailVerificationToken",
    "PasswordResetToken",
    "OAuthAccount",
    # Conversations
    "Conversation",
    "Message",
    "ConversationStatus",
    "MessageRole",
    # FIR
    "FIRReport",
    "FIRStatus",
    # Documents
    "UploadedDocument",
    "DocumentStatus",
    # Audit
    "AuditLog",
]
