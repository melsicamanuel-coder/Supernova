from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.project import Project
from app.services import workflow_service
from app.services.workflow_service import launch_workflow_background

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_IDEA = (
    "TaskFlow — A modern project management tool designed for small engineering "
    "teams (3-10 people). It combines task tracking, sprint planning, and team "
    "communication in a single lightweight web application. Key differentiators: "
    "AI-powered task estimation, automatic sprint health scoring, and a "
    "distraction-free 'focus mode' that hides everything except the current "
    "task. Built with a clean, minimal interface that prioritizes speed over "
    "feature count. Target market: indie dev teams and early-stage startups "
    "that find Jira too complex and Trello too simple."
)


@router.post("/start")
async def start_demo(db: AsyncSession = Depends(get_db)):
    project = Project(
        name="TaskFlow",
        description="AI-powered project management for small engineering teams",
        idea_text=DEMO_IDEA,
        is_demo=True,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    try:
        run = await workflow_service.start_workflow(project.id, db)
        launch_workflow_background(run)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    return {"project_id": project.id, "workflow_run_id": run.id}
