from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.project import Project
from app.models.workflow import WorkflowRun
from app.schemas.workflow import WorkflowRunResponse
from app.services.workflow_service import launch_workflow_background
from app.services import workflow_service

router = APIRouter(prefix="/projects/{project_id}/workflow", tags=["workflow"])


@router.get("", response_model=WorkflowRunResponse)
async def get_workflow(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.project_id == project_id)
        .order_by(WorkflowRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "No workflow run found for this project")
    return run


@router.post("/start", response_model=WorkflowRunResponse, status_code=201)
async def start_workflow_endpoint(project_id: str, db: AsyncSession = Depends(get_db)):
    try:
        run = await workflow_service.start_workflow(project_id, db)
        launch_workflow_background(run)
        return run
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post("/pause", response_model=WorkflowRunResponse)
async def pause_workflow(project_id: str, db: AsyncSession = Depends(get_db)):
    run = await _get_active_run(project_id, db)
    run.status = "paused"
    await db.commit()
    await db.refresh(run)
    return run


@router.post("/resume", response_model=WorkflowRunResponse)
async def resume_workflow(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.project_id == project_id)
        .order_by(WorkflowRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(400, "No workflow run found")

    if run.status == "awaiting_approval":
        raise HTTPException(
            400,
            "Workflow is awaiting approval. Resolve the approval to continue.",
        )
    if run.status != "paused":
        raise HTTPException(400, f"Cannot resume: workflow status is '{run.status}'")

    run.status = "running"
    await db.commit()
    await db.refresh(run)
    return run


@router.post("/cancel", response_model=WorkflowRunResponse)
async def cancel_workflow(project_id: str, db: AsyncSession = Depends(get_db)):
    run = await _get_active_run(project_id, db)
    run.status = "cancelled"
    project = await db.get(Project, project_id)
    if project:
        project.status = "failed"
    await db.commit()
    await db.refresh(run)
    return run


async def _get_active_run(project_id: str, db: AsyncSession) -> WorkflowRun:
    result = await db.execute(
        select(WorkflowRun)
        .where(WorkflowRun.project_id == project_id)
        .order_by(WorkflowRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run or run.status not in ("running", "pending"):
        raise HTTPException(400, "No active workflow run to modify")
    return run
