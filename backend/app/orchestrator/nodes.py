import logging
from typing import Any

from app.agents.base import AgentInput, AgentOutput, BaseAgent
from app.agents.ceo import CEOAgent, CEOReviewAgent
from app.agents.cpo import CPOAgent
from app.agents.cto import CTOAgent
from app.agents.engineering import EngineeringAgent
from app.agents.qa import QAAgent
from app.agents.research import ResearchAgent
from app.config import settings
from app.db.session import async_session
from app.models.approval import Approval
from app.models.base import generate_uuid, utcnow
from app.models.document import Document
from app.models.workflow import WorkflowRun, WorkflowStep
from app.providers.registry import registry
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

DOC_TYPE_MAP = {
    "ceo": "executive_summary",
    "ceo_review": "ceo_final_review",
    "research": "research_report",
    "cpo": "prd",
    "cto": "tech_architecture",
    "engineering": "task_breakdown",
    "qa": "test_plan",
}

DOC_TITLE_MAP = {
    "ceo": "Executive Summary",
    "ceo_review": "CEO Final Review",
    "research": "Research Report",
    "cpo": "Product Requirements Document",
    "cto": "Technical Architecture",
    "engineering": "Engineering Task Breakdown",
    "qa": "Test Plan",
}

STATE_KEY_MAP = {
    "ceo": "ceo_initial_evaluation",
    "ceo_review": "ceo_final_review",
    "research": "research_report",
    "cpo": "prd",
    "cto": "tech_architecture",
    "engineering": "task_breakdown",
    "qa": "test_plan",
}


def _get_provider():
    return registry.get(settings.provider)


def _build_agent_input(state: dict[str, Any]) -> AgentInput:
    return AgentInput(
        project_id=state.get("project_id", ""),
        idea_text=state.get("idea_text", ""),
        project_name=state.get("project_name", "Unnamed Project"),
        shared_state=state,
    )


async def _run_agent_node(
    state: dict[str, Any],
    agent: BaseAgent,
    node_name: str,
    state_key: str,
) -> dict[str, Any]:
    workflow_run_id = state.get("workflow_run_id", "")
    project_id = state.get("project_id", "")
    agent_type = agent.agent_type

    step_id = generate_uuid()
    started_at = utcnow()

    async with async_session() as db:
        step = WorkflowStep(
            id=step_id,
            workflow_run_id=workflow_run_id,
            agent_type=agent_type,
            node_name=node_name,
            status="running",
            started_at=started_at,
        )
        db.add(step)
        await db.commit()

    await ws_manager.broadcast(project_id, {
        "type": "step_started",
        "node": node_name,
        "agent_type": agent_type,
    })

    agent_input = _build_agent_input(state)
    result: AgentOutput = await agent.execute(agent_input)

    async with async_session() as db:
        step = await db.get(WorkflowStep, step_id)
        if step:
            step.status = "completed" if result.status == "success" else "failed"
            step.output_data = result.output
            step.duration_ms = result.duration_ms
            step.provider_used = result.provider_used
            step.model_used = result.model_used
            step.token_usage = result.token_usage
            step.error_message = result.error
            step.completed_at = utcnow()
            step.retry_count = agent_input.retry_count

            if result.status == "success":
                doc_type = DOC_TYPE_MAP.get(agent_type, agent_type)
                doc = Document(
                    project_id=project_id,
                    doc_type=doc_type,
                    title=DOC_TITLE_MAP.get(agent_type, node_name),
                    content=result.output,
                    version=1,
                    agent_type=agent_type,
                    workflow_step_id=step_id,
                )
                db.add(doc)

            run = await db.get(WorkflowRun, workflow_run_id)
            if run:
                run.current_node = node_name
                run.state_snapshot = {**state, state_key: result.output}

            await db.commit()

    await ws_manager.broadcast(project_id, {
        "type": "step_completed",
        "node": node_name,
        "agent_type": agent_type,
        "status": result.status,
        "duration_ms": result.duration_ms,
    })

    if result.status == "failure":
        logger.error("Agent %s failed at node %s: %s", agent_type, node_name, result.error)
        return {
            state_key: None,
            "current_node": node_name,
            "error": result.error,
            "workflow_status": "failed",
        }

    return {
        state_key: result.output,
        "current_node": node_name,
        "workflow_status": "running",
    }


async def ceo_evaluate_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = CEOAgent(_get_provider())
    return await _run_agent_node(state, agent, "ceo_evaluate", "ceo_initial_evaluation")


async def research_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = ResearchAgent(_get_provider())
    return await _run_agent_node(state, agent, "research", "research_report")


async def cpo_define_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = CPOAgent(_get_provider())
    return await _run_agent_node(state, agent, "cpo_define", "prd")


async def cto_design_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = CTOAgent(_get_provider())
    return await _run_agent_node(state, agent, "cto_design", "tech_architecture")


async def eng_plan_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = EngineeringAgent(_get_provider())
    return await _run_agent_node(state, agent, "eng_plan", "task_breakdown")


async def qa_plan_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = QAAgent(_get_provider())
    return await _run_agent_node(state, agent, "qa_plan", "test_plan")


async def ceo_review_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = CEOReviewAgent(_get_provider())
    return await _run_agent_node(state, agent, "ceo_review", "ceo_final_review")


async def approval_gate_node(state: dict[str, Any]) -> dict[str, Any]:
    project_id = state.get("project_id", "")
    workflow_run_id = state.get("workflow_run_id", "")

    async with async_session() as db:
        approval = Approval(
            project_id=project_id,
            workflow_run_id=workflow_run_id,
            step_name="ceo_review_approval",
            status="pending",
            output_snapshot=state.get("ceo_final_review"),
            requested_at=utcnow(),
        )
        db.add(approval)

        run = await db.get(WorkflowRun, workflow_run_id)
        if run:
            run.status = "awaiting_approval"
            run.current_node = "approval_gate"

        await db.commit()

    await ws_manager.broadcast(project_id, {
        "type": "approval_requested",
        "node": "approval_gate",
        "workflow_run_id": workflow_run_id,
    })

    return {
        "current_node": "approval_gate",
        "workflow_status": "awaiting_approval",
        "approval_status": "pending",
    }


def route_after_ceo_evaluate(state: dict[str, Any]) -> str:
    if state.get("workflow_status") == "failed":
        return "end"
    evaluation = state.get("ceo_initial_evaluation")
    if evaluation and evaluation.get("verdict") == "reject":
        return "end"
    return "research"


def route_after_approval(state: dict[str, Any]) -> str:
    decision = state.get("approval_decision")
    if decision == "approved":
        return "end"
    return "end"
