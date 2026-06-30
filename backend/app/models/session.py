"""
In-memory session store for conversation management.
Each session tracks the accumulated narrative, collected fields, and conversation history.
"""
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import uuid


@dataclass
class ConversationTurn:
    role: str  # "user" | "assistant"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class Session:
    session_id: str
    narrative_parts: list[str] = field(default_factory=list)  # Each user message
    full_narrative: str = ""  # Concatenated narrative for NLP
    conversation: list[ConversationTurn] = field(default_factory=list)
    collected_fields: dict = field(default_factory=dict)  # What the NLP has extracted
    missing_fields: list[str] = field(default_factory=list)
    asked_fields: set = field(default_factory=set)  # Fields already asked about
    last_nlp_result: Optional[dict] = None
    last_rule_result: Optional[dict] = None
    complainant_name: str = "Not Provided"
    complainant_contact: str = "Not Provided"
    police_station: str = "Not Specified"
    is_complete: bool = False
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def update_timestamp(self):
        self.updated_at = datetime.utcnow().isoformat()

    def add_user_message(self, content: str):
        self.conversation.append(ConversationTurn(role="user", content=content))
        self.update_timestamp()

    def add_assistant_message(self, content: str):
        self.conversation.append(ConversationTurn(role="assistant", content=content))
        self.update_timestamp()

    def append_narrative(self, text: str):
        """Append user message to the running narrative."""
        self.narrative_parts.append(text)
        # Build full narrative as a coherent text block
        self.full_narrative = " ".join(self.narrative_parts)
        self.update_timestamp()

    def get_conversation_dicts(self) -> list[dict]:
        return [
            {"role": t.role, "content": t.content, "timestamp": t.timestamp}
            for t in self.conversation
        ]


# ── Global in-memory store ────────────────────────────────────────────────────
_sessions: dict[str, Session] = {}


def create_session(session_id: Optional[str] = None) -> Session:
    """Create and register a new session."""
    sid = session_id or str(uuid.uuid4())
    session = Session(session_id=sid)
    _sessions[sid] = session
    return session


def get_session(session_id: str) -> Optional[Session]:
    """Retrieve an existing session by ID."""
    return _sessions.get(session_id)


def get_or_create_session(session_id: Optional[str]) -> Session:
    """Get existing session or create a new one."""
    if session_id and session_id in _sessions:
        return _sessions[session_id]
    return create_session(session_id)


def delete_session(session_id: str) -> bool:
    """Delete a session. Returns True if it existed."""
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False


def list_sessions() -> list[dict]:
    """List all sessions with summary info."""
    return [
        {
            "session_id": s.session_id,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "is_complete": s.is_complete,
            "message_count": len(s.conversation),
            "preview": s.conversation[0].content[:60] + "..." if s.conversation else ""
        }
        for s in _sessions.values()
    ]
