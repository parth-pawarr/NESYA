"""
Pydantic schemas for the FIR Chat API.
"""
from typing import Optional, Any
from pydantic import BaseModel, Field
import uuid


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's message in the conversation")
    session_id: Optional[str] = Field(None, description="Session ID (auto-created if not provided)")
    complainant_name: Optional[str] = Field(None, description="Complainant's name if provided")
    complainant_contact: Optional[str] = Field(None, description="Contact details")
    police_station: Optional[str] = Field(None, description="Target police station")


class ConversationMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    timestamp: str


class FIRSection(BaseModel):
    section_id: str
    title: str
    confidence: float
    explanation: str
    punishment: str


class FIRDocument(BaseModel):
    fir_number: str
    date_of_report: str
    complainant_name: str
    complainant_contact: str
    police_station: str
    incident_date: Optional[str]
    incident_time: Optional[str]
    incident_location: Optional[str]
    location_type: Optional[str]
    crime_type: str
    description: str
    accused_details: str
    witness_details: list[str]
    property_details: list[str]
    financial_loss: Optional[str]
    legal_sections: list[dict]
    quality_flags: list[dict]
    overall_confidence: float
    raw_nlp: dict
    raw_rule_engine: dict


class ChatResponse(BaseModel):
    session_id: str
    status: str  # "collecting" | "analyzing" | "fir_ready" | "error"
    message: str  # AI assistant's reply
    missing_fields: list[str]
    completion_percentage: int
    fir_data: Optional[FIRDocument] = None
    suggested_replies: list[str] = []
    conversation: list[ConversationMessage] = []


class AnalyzeRequest(BaseModel):
    narrative: str
    session_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    session_id: str
    nlp_result: dict
    rule_result: dict
    missing_fields: list[str]
    completion_percentage: int


class GenerateFIRRequest(BaseModel):
    session_id: str
    complainant_name: Optional[str] = "Not Provided"
    complainant_contact: Optional[str] = "Not Provided"
    police_station: Optional[str] = "Not Specified"


class ResetRequest(BaseModel):
    session_id: str


class ResetResponse(BaseModel):
    success: bool
    message: str
