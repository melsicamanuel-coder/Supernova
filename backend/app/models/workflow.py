from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, utcnow


class WorkflowRun(Base, IDMixin, TimestampMixin):
    __tablename__ = "workflow_runs"

    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE")
    )
    status: Mapped[str] = mapped_column(String(30), default="pending")
    current_node: Mapped[Optional[str]] = mapped_column(String(50), default=None)
    state_snapshot: Mapped[dict | None] = mapped_column(JSON, default=None)
    error_message: Mapped[Optional[str]] = mapped_column(Text, default=None)
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=None
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=None
    )

    project = relationship("Project", back_populates="workflow_runs")
    steps = relationship("WorkflowStep", back_populates="workflow_run", lazy="selectin")

    __table_args__ = (
        Index("ix_workflow_runs_project_status", "project_id", "status"),
    )


class WorkflowStep(Base, IDMixin, TimestampMixin):
    __tablename__ = "workflow_steps"

    workflow_run_id: Mapped[str] = mapped_column(
        String, ForeignKey("workflow_runs.id", ondelete="CASCADE")
    )
    agent_type: Mapped[str] = mapped_column(String(30))
    node_name: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    input_summary: Mapped[dict | None] = mapped_column(JSON, default=None)
    output_data: Mapped[dict | None] = mapped_column(JSON, default=None)
    error_message: Mapped[Optional[str]] = mapped_column(Text, default=None)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, default=None)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    provider_used: Mapped[Optional[str]] = mapped_column(String(30), default=None)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), default=None)
    token_usage: Mapped[dict | None] = mapped_column(JSON, default=None)
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=None
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=None
    )

    workflow_run = relationship("WorkflowRun", back_populates="steps")

    __table_args__ = (
        Index("ix_workflow_steps_run_id", "workflow_run_id"),
        Index("ix_workflow_steps_agent_type", "agent_type"),
    )
