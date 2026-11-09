from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import Approval
from app.models.base import utcnow


async def create_approval(
    db: AsyncSession,
    project_id: str,
    workflow_run_id: str,
    step_name: str,
    output_snapshot: dict | None = None,
) -> Approval:
    approval = Approval(
        project_id=project_id,
        workflow_run_id=workflow_run_id,
        step_name=step_name,
        status="pending",
        output_snapshot=output_snapshot,
        requested_at=utcnow(),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)
    return approval


async def resolve_approval(
    db: AsyncSession,
    approval_id: str,
    decision: str,
    notes: str | None = None,
) -> Approval:
    approval = await db.get(Approval, approval_id)
    if not approval:
        raise ValueError("Approval not found")
    if approval.status != "pending":
        raise ValueError(f"Approval already resolved: {approval.status}")

    approval.status = decision
    approval.decision = decision
    approval.reviewer_notes = notes
    approval.resolved_at = utcnow()

    await db.commit()
    await db.refresh(approval)
    return approval


async def get_pending_approval(db: AsyncSession, workflow_run_id: str) -> Approval | None:
    result = await db.execute(
        select(Approval)
        .where(
            Approval.workflow_run_id == workflow_run_id,
            Approval.status == "pending",
        )
        .order_by(Approval.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
