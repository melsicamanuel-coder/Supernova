"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-11-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("idea_text", sa.Text(), nullable=False),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("is_demo", sa.Boolean(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_created_at", "projects", ["created_at"])

    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(30), server_default="pending"),
        sa.Column("current_node", sa.String(50), nullable=True),
        sa.Column("state_snapshot", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_workflow_runs_project_status", "workflow_runs", ["project_id", "status"])

    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workflow_run_id", sa.String(), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("agent_type", sa.String(30), nullable=False),
        sa.Column("node_name", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("input_summary", sa.JSON(), nullable=True),
        sa.Column("output_data", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("retry_count", sa.Integer(), server_default="0"),
        sa.Column("provider_used", sa.String(30), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("token_usage", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_workflow_steps_run_id", "workflow_steps", ["workflow_run_id"])
    op.create_index("ix_workflow_steps_agent_type", "workflow_steps", ["agent_type"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doc_type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("agent_type", sa.String(30), nullable=False),
        sa.Column("workflow_step_id", sa.String(), sa.ForeignKey("workflow_steps.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_project_type", "documents", ["project_id", "doc_type"])

    op.create_table(
        "approvals",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workflow_run_id", sa.String(), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_name", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), server_default="pending"),
        sa.Column("decision", sa.String(30), nullable=True),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("output_snapshot", sa.JSON(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_approvals_project_status", "approvals", ["project_id", "status"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("actor", sa.String(30), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_log_project_ts", "audit_log", ["project_id", "timestamp"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("approvals")
    op.drop_table("documents")
    op.drop_table("workflow_steps")
    op.drop_table("workflow_runs")
    op.drop_table("projects")
