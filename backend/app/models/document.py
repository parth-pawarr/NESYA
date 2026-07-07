"""
NESYA ORM Models — Uploaded Documents

Tracks files uploaded by users, linked optionally to an FIR report.
"""
import enum
import uuid

from sqlalchemy import (
    BigInteger, Column, DateTime, Enum as SAEnum, ForeignKey, Index, String, Text,
)
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"
    __table_args__ = (
        Index("ix_uploaded_documents_user_id", "user_id"),
        Index("ix_uploaded_documents_fir_report_id", "fir_report_id"),
        Index("ix_uploaded_documents_status", "status"),
        Index("ix_uploaded_documents_created_at", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    fir_report_id = Column(
        UUID(as_uuid=True),
        ForeignKey("fir_reports.id", ondelete="SET NULL"),
        nullable=True,
    )
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_path = Column(Text, nullable=False)
    content_type = Column(String(100), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    status = Column(
        SAEnum(DocumentStatus, name="documentstatus"),
        default=DocumentStatus.PENDING,
        nullable=False,
    )
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="uploaded_documents")
    fir_report = relationship("FIRReport", back_populates="documents")
