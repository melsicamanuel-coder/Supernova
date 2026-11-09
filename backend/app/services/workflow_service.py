import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session
from app.models.approval import Approval
from app.models.base import utcnow
from app.models.project import Project
from app.models.workflow import WorkflowRun
from app.orchestrator.graph import get_compiled_graph
from app.orchestrator.state import SharedProjectState
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


async def _run_graph(project_id: str, workflow_run_id: str, initial_state: dict):
    try:
        compiled = await get_compiled_graph()
        config = {"configurable": {"thread_id": workflow_run_id}}

        result = await compiled.ainvoke(initial_state, config=config)

        async with async_session() as db:
            run = await db.get(WorkflowRun, workflow_run_id)
            if run:
                if run.status == "awaiting_approval":
                    pass
                elif result.get("workflow_status") == "failed":
                    run.status = "failed"
                    run.error_message = result.get("error")
                    run.completed_at = utcnow()
                    project = await db.get(Project, project_id)
                    if project:
                        project.status = "failed"
                else:
                    run.status = "awaiting_approval"
                    run.current_node = "approval_gate"
                    approval = Approval(
                        project_id=project_id,
                        workflow_run_id=workflow_run_id,
                        step_name="ceo_review_approval",
                        status="pending",
                        output_snapshot=result.get("ceo_final_review"),
                        requested_at=utcnow(),
                    )
                    db.add(approval)
                run.state_snapshot = dict(result)
                await db.commit()

        await ws_manager.broadcast(project_id, {
            "type": "workflow_paused" if result.get("workflow_status") != "failed" else "workflow_failed",
            "workflow_run_id": workflow_run_id,
            "current_node": result.get("current_node"),
        })

    except Exception as exc:
        logger.exception("Workflow execution failed for run %s", workflow_run_id)
        async with async_session() as db:
            run = await db.get(WorkflowRun, workflow_run_id)
            if run:
                run.status = "failed"
                run.error_message = str(exc)
                run.completed_at = utcnow()
            project = await db.get(Project, project_id)
            if project:
                project.status = "failed"
            await db.commit()

        await ws_manager.broadcast(project_id, {
            "type": "workflow_failed",
            "workflow_run_id": workflow_run_id,
            "error": str(exc),
        })


async def start_workflow(project_id: str, db: AsyncSession) -> WorkflowRun:
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    if project.status not in ("draft", "failed"):
        raise ValueError(f"Cannot start workflow: project status is '{project.status}'")

    run = WorkflowRun(
        project_id=project_id,
        status="running",
        started_at=utcnow(),
    )
    db.add(run)
    project.status = "active"
    await db.commit()
    await db.refresh(run)

    initial_state: dict = {
        "project_id": project_id,
        "project_name": project.name,
        "idea_text": project.idea_text,
        "workflow_run_id": run.id,
        "workflow_status": "running",
    }

    run._initial_state = initial_state  # type: ignore[attr-defined]
    return run


def launch_workflow_background(run: WorkflowRun) -> None:
    state = getattr(run, "_initial_state", None)
    if state:
        asyncio.create_task(_run_graph(run.project_id, run.id, state))


async def resume_after_approval(
    workflow_run_id: str,
    decision: str,
    notes: str | None,
    db: AsyncSession,
) -> WorkflowRun:
    run = await db.get(WorkflowRun, workflow_run_id)
    if not run:
        raise ValueError("Workflow run not found")
    if run.status != "awaiting_approval":
        raise ValueError(f"Cannot resume: workflow status is '{run.status}'")

    if decision == "approved":
        compiled = await get_compiled_graph()
        config = {"configurable": {"thread_id": workflow_run_id}}

        run.status = "completing"
        await db.commit()

        async def _resume():
            try:
                result = await compiled.ainvoke(None, config=config)
                async with async_session() as inner_db:
                    r = await inner_db.get(WorkflowRun, workflow_run_id)
                    if r:
                        r.status = "completed"
                        r.completed_at = utcnow()
                        r.state_snapshot = dict(result)
                    project = await inner_db.get(Project, run.project_id)
                    if project:
                        project.status = "completed"
                    await inner_db.commit()
                await ws_manager.broadcast(run.project_id, {
                    "type": "workflow_completed",
                    "workflow_run_id": workflow_run_id,
                })
            except Exception as exc:
                logger.exception("Resume failed for run %s", workflow_run_id)
                async with async_session() as inner_db:
                    r = await inner_db.get(WorkflowRun, workflow_run_id)
                    if r:
                        r.status = "failed"
                        r.error_message = str(exc)
                        r.completed_at = utcnow()
                    await inner_db.commit()

        asyncio.create_task(_resume())
    else:
        run.status = "rejected" if decision == "rejected" else "revision_requested"
        run.completed_at = utcnow()
        project = await db.get(Project, run.project_id)
        if project:
            project.status = "failed" if decision == "rejected" else "draft"
        await db.commit()

        await ws_manager.broadcast(run.project_id, {
            "type": "workflow_rejected" if decision == "rejected" else "workflow_revision_requested",
            "workflow_run_id": workflow_run_id,
        })

    await db.refresh(run)
    return run
