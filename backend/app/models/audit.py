from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, utcnow


class AuditLog(Base, IDMixin):
    __tablename__ = "audit_log"

    project_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("projects.id", ondelete="SET NULL"), default=None
    )
    event_type: Mapped[str] = mapped_column(String(50))
    actor: Mapped[str] = mapped_column(String(30))
    details: Mapped[dict | None] = mapped_column(JSON, default=None)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    __table_args__ = (
        Index("ix_audit_log_project_ts", "project_id", "timestamp"),
    )
