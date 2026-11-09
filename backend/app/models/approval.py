from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin


class Approval(Base, IDMixin, TimestampMixin):
    __tablename__ = "approvals"

    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE")
    )
    workflow_run_id: Mapped[str] = mapped_column(
        String, ForeignKey("workflow_runs.id", ondelete="CASCADE")
    )
    step_name: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="pending")
    decision: Mapped[Optional[str]] = mapped_column(String(30), default=None)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    output_snapshot: Mapped[dict | None] = mapped_column(JSON, default=None)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=None
    )

    project = relationship("Project", back_populates="approvals")

    __table_args__ = (
        Index("ix_approvals_project_status", "project_id", "status"),
    )
