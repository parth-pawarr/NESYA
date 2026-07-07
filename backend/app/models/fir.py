"""
NESYA ORM Models — FIR Reports

Stores generated First Information Reports with full NLP/rule-engine output.
"""
import enum
import uuid

from sqlalchemy import (
    Column, DateTime, Enum as SAEnum, Float, ForeignKey, Index, JSON, String, Text,
)
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class FIRStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    REJECTED = "rejected"


class FIRReport(Base):
    __tablename__ = "fir_reports"
    __table_args__ = (
        Index("ix_fir_reports_user_id", "user_id"),
        Index("ix_fir_reports_conversation_id", "conversation_id"),
        Index("ix_fir_reports_fir_number", "fir_number"),
        Index("ix_fir_reports_status", "status"),
        Index("ix_fir_reports_created_at", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── FIR Metadata ─────────────────────────────────────────────────────────
    fir_number = Column(String(100), unique=True, nullable=False)
    status = Column(
        SAEnum(FIRStatus, name="fir_status"),
        default=FIRStatus.DRAFT,
        nullable=False,
    )
    date_of_report = Column(String(50), nullable=True)

    # ── Complainant ───────────────────────────────────────────────────────────
    complainant_name = Column(String(255), nullable=True)
    complainant_contact = Column(String(100), nullable=True)
    complainant_address = Column(Text, nullable=True)

    # ── Incident ──────────────────────────────────────────────────────────────
    incident_date = Column(String(50), nullable=True)
    incident_time = Column(String(50), nullable=True)
    incident_location = Column(Text, nullable=True)
    location_type = Column(String(100), nullable=True)

    # ── Crime ─────────────────────────────────────────────────────────────────
    crime_type = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    accused_details = Column(Text, nullable=True)
    witness_details = Column(JSON, nullable=True)    # list[str]
    property_details = Column(JSON, nullable=True)   # list[str]
    financial_loss = Column(String(100), nullable=True)
    police_station = Column(String(255), nullable=True)

    # ── Legal Analysis ────────────────────────────────────────────────────────
    legal_sections = Column(JSON, nullable=True)     # list[dict]
    quality_flags = Column(JSON, nullable=True)      # list[dict]
    overall_confidence = Column(Float, nullable=True)
    raw_nlp = Column(JSON, nullable=True)
    raw_rule_engine = Column(JSON, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="fir_reports")
    conversation = relationship("Conversation", back_populates="fir_report")
    documents = relationship(
        "UploadedDocument", back_populates="fir_report", lazy="select"
    )
