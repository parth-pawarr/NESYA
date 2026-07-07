"""
NESYA ORM Models — Audit Logs

Immutable audit trail for security-sensitive events (login, password reset,
FIR creation, etc.). Rows are never updated or deleted.
"""
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Nullable — some events occur before a user is known (e.g. failed login)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Dot-namespaced action strings, e.g. "user.login", "fir.created"
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=True)   # "user", "fir_report", …
    resource_id = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)       # Supports IPv6
    user_agent = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)                # Arbitrary extra context
    status = Column(String(20), nullable=True)           # "success" | "failure"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="audit_logs")
