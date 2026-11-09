from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.workflow import WorkflowStep
from app.schemas.agent import AgentInfo, AgentListResponse

router = APIRouter(prefix="/agents", tags=["agents"])

AGENT_DEFINITIONS = {
    "ceo": {
        "name": "CEO Agent",
        "description": "Strategic evaluation, business feasibility, executive review",
        "step_types": ["ceo", "ceo_review"],
    },
    "research": {"name": "Research Agent", "description": "Market analysis, competitor research, assumption identification"},
    "cpo": {"name": "CPO Agent", "description": "Product requirements, user personas, feature prioritisation"},
    "cto": {"name": "CTO Agent", "description": "Technical architecture, technology selection, infrastructure design"},
    "engineering": {"name": "Engineering Agent", "description": "Task breakdown, dependency mapping, implementation planning"},
    "qa": {"name": "QA Agent", "description": "Test strategy, scenario generation, quality assessment"},
}


@router.get("", response_model=AgentListResponse)
async def list_agents(db: AsyncSession = Depends(get_db)):
    agents = []
    for agent_type, defn in AGENT_DEFINITIONS.items():
        step_types = defn.get("step_types", [agent_type])
        stats = await db.execute(
            select(
                func.count(WorkflowStep.id),
                func.avg(WorkflowStep.duration_ms),
                func.max(WorkflowStep.completed_at),
            ).where(
                WorkflowStep.agent_type.in_(step_types),
                WorkflowStep.status == "completed",
            )
        )
        row = stats.one()
        agents.append(AgentInfo(
            type=agent_type,
            name=defn["name"],
            description=defn["description"],
            status="idle",
            total_executions=row[0] or 0,
            avg_duration_ms=int(row[1]) if row[1] else None,
            last_executed_at=row[2],
        ))
    return AgentListResponse(agents=agents)


@router.get("/{agent_type}", response_model=AgentInfo)
async def get_agent(agent_type: str, db: AsyncSession = Depends(get_db)):
    if agent_type not in AGENT_DEFINITIONS:
        raise HTTPException(404, f"Unknown agent type: {agent_type}")

    defn = AGENT_DEFINITIONS[agent_type]
    step_types = defn.get("step_types", [agent_type])
    stats = await db.execute(
        select(
            func.count(WorkflowStep.id),
            func.avg(WorkflowStep.duration_ms),
            func.max(WorkflowStep.completed_at),
        ).where(
            WorkflowStep.agent_type.in_(step_types),
            WorkflowStep.status == "completed",
        )
    )
    row = stats.one()
    return AgentInfo(
        type=agent_type,
        name=defn["name"],
        description=defn["description"],
        status="idle",
        total_executions=row[0] or 0,
        avg_duration_ms=int(row[1]) if row[1] else None,
        last_executed_at=row[2],
    )
