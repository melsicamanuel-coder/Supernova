from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, utcnow


class Project(Base, IDMixin, TimestampMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    idea_text: Mapped[str] = mapped_column(Text)
    config: Mapped[dict | None] = mapped_column(JSON, default=None)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    workflow_runs = relationship("WorkflowRun", back_populates="project", lazy="selectin")
    documents = relationship("Document", back_populates="project", lazy="selectin")
    approvals = relationship("Approval", back_populates="project", lazy="selectin")

    __table_args__ = (
        Index("ix_projects_status", "status"),
        Index("ix_projects_created_at", "created_at"),
    )
