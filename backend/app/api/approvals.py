from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.approval import Approval
from app.models.base import utcnow
from app.schemas.approval import ApprovalResolve, ApprovalResponse
from app.services import workflow_service

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalResponse])
async def list_approvals(
    status: str | None = None,
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Approval).order_by(Approval.created_at.desc())
    if status:
        query = query.where(Approval.status == status)
    if project_id:
        query = query.where(Approval.project_id == project_id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(approval_id: str, db: AsyncSession = Depends(get_db)):
    approval = await db.get(Approval, approval_id)
    if not approval:
        raise HTTPException(404, "Approval not found")
    return approval


@router.post("/{approval_id}/resolve", response_model=ApprovalResponse)
async def resolve_approval(
    approval_id: str,
    body: ApprovalResolve,
    db: AsyncSession = Depends(get_db),
):
    approval = await db.get(Approval, approval_id)
    if not approval:
        raise HTTPException(404, "Approval not found")
    if approval.status != "pending":
        raise HTTPException(400, f"Approval already resolved: {approval.status}")

    approval.status = body.decision
    approval.decision = body.decision
    approval.reviewer_notes = body.notes
    approval.resolved_at = utcnow()
    await db.commit()
    await db.refresh(approval)

    try:
        await workflow_service.resume_after_approval(
            workflow_run_id=approval.workflow_run_id,
            decision=body.decision,
            notes=body.notes,
            db=db,
        )
    except ValueError:
        pass

    return approval
