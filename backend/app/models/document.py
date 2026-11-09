from typing import Optional

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin


class Document(Base, IDMixin, TimestampMixin):
    __tablename__ = "documents"

    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE")
    )
    doc_type: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[dict] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1)
    agent_type: Mapped[str] = mapped_column(String(30))
    workflow_step_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("workflow_steps.id"), default=None
    )

    project = relationship("Project", back_populates="documents")

    __table_args__ = (
        Index("ix_documents_project_type", "project_id", "doc_type"),
    )
