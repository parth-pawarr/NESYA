"""
NESYA ORM Models — User

Central user table with support for local auth and multiple OAuth providers.
All PK/FK use UUID v4 for security and horizontal scalability.
"""
import enum
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum, Index, String, Text,
)
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuthProvider(str, enum.Enum):
    LOCAL = "local"
    GOOGLE = "google"
    GITHUB = "github"
    MICROSOFT = "microsoft"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email", "email"),          # Fast look-up by email
        Index("ix_users_created_at", "created_at"),
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)   # NULL for pure OAuth accounts

    # ── Profile ───────────────────────────────────────────────────────────────
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)

    # ── Auth State ────────────────────────────────────────────────────────────
    auth_provider = Column(
        SAEnum(AuthProvider, name="authprovider"),
        default=AuthProvider.LOCAL,
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relationships (cascade delete on user removal) ────────────────────────
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    email_verification_tokens = relationship(
        "EmailVerificationToken", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    oauth_accounts = relationship(
        "OAuthAccount", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    conversations = relationship(
        "Conversation", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    fir_reports = relationship(
        "FIRReport", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    uploaded_documents = relationship(
        "UploadedDocument", back_populates="user", cascade="all, delete-orphan", lazy="select"
    )
    audit_logs = relationship(
        "AuditLog", back_populates="user", lazy="select"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r}>"
