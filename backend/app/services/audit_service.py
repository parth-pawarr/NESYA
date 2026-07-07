"""
NESYA — Audit Logging Helper

Writes an AuditLog row best-effort (errors are swallowed so audit failures
never break the primary request flow).
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


async def log_audit(
    db: AsyncSession,
    action: str,
    *,
    request: Optional[Request] = None,
    user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: str = "success",
    details: Optional[dict] = None,
) -> None:
    """
    Append an audit log entry to the current DB session.
    The caller is responsible for committing.
    """
    try:
        ip = request.client.host if (request and request.client) else None
        ua = request.headers.get("user-agent") if request else None

        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip,
            user_agent=ua,
            details=details,
            status=status,
        )
        db.add(entry)
    except Exception as exc:  # pragma: no cover
        logger.warning("Audit logging failed for action=%s: %s", action, exc)
