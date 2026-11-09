import pytest

from app.agents.base import AgentInput, AgentOutput
from app.agents.ceo import CEOAgent, CEOReviewAgent
from app.agents.cpo import CPOAgent
from app.agents.cto import CTOAgent
from app.agents.engineering import EngineeringAgent
from app.agents.qa import QAAgent
from app.agents.research import ResearchAgent
from app.agents.schemas import (
    ExecutiveSummary,
    PRD,
    ResearchReport,
    TaskBreakdown,
    TechArchitecture,
    TestPlan,
)
from app.providers.mock import MockProvider


def _make_input(**overrides) -> AgentInput:
    defaults = {
        "project_id": "test-project-id",
        "idea_text": "TaskFlow — a modern project management tool for small teams",
        "project_name": "TaskFlow",
        "shared_state": {},
    }
    defaults.update(overrides)
    return AgentInput(**defaults)


@pytest.mark.asyncio
async def test_ceo_agent():
    provider = MockProvider()
    agent = CEOAgent(provider)
    result = await agent.execute(_make_input())

    assert isinstance(result, AgentOutput)
    assert result.status == "success"
    assert result.agent_type == "ceo"
    assert result.duration_ms >= 0
    assert result.provider_used == "mock"
    ExecutiveSummary.model_validate(result.output)


@pytest.mark.asyncio
async def test_research_agent():
    provider = MockProvider()
    agent = ResearchAgent(provider)
    result = await agent.execute(_make_input(
        shared_state={"ceo_initial_evaluation": {"verdict": "proceed", "summary": "Looks good"}}
    ))

    assert result.status == "success"
    assert result.agent_type == "research"
    ResearchReport.model_validate(result.output)


@pytest.mark.asyncio
async def test_cpo_agent():
    provider = MockProvider()
    agent = CPOAgent(provider)
    result = await agent.execute(_make_input(
        shared_state={
            "ceo_initial_evaluation": {"verdict": "proceed"},
            "research_report": {"executive_summary": "Market is viable"},
        }
    ))

    assert result.status == "success"
    assert result.agent_type == "cpo"
    PRD.model_validate(result.output)


@pytest.mark.asyncio
async def test_cto_agent():
    provider = MockProvider()
    agent = CTOAgent(provider)
    result = await agent.execute(_make_input(
        shared_state={"prd": {"product_name": "TaskFlow", "vision": "Project management"}}
    ))

    assert result.status == "success"
    assert result.agent_type == "cto"
    TechArchitecture.model_validate(result.output)


@pytest.mark.asyncio
async def test_engineering_agent():
    provider = MockProvider()
    agent = EngineeringAgent(provider)
    result = await agent.execute(_make_input(
        shared_state={
            "prd": {"product_name": "TaskFlow"},
            "tech_architecture": {"overview": "Monolith"},
        }
    ))

    assert result.status == "success"
    assert result.agent_type == "engineering"
    TaskBreakdown.model_validate(result.output)


@pytest.mark.asyncio
async def test_qa_agent():
    provider = MockProvider()
    agent = QAAgent(provider)
    result = await agent.execute(_make_input(
        shared_state={
            "prd": {"product_name": "TaskFlow"},
            "tech_architecture": {"overview": "Monolith"},
            "task_breakdown": {"total_tasks": 20},
        }
    ))

    assert result.status == "success"
    assert result.agent_type == "qa"
    TestPlan.model_validate(result.output)


@pytest.mark.asyncio
async def test_ceo_review_agent():
    provider = MockProvider()
    agent = CEOReviewAgent(provider)
    result = await agent.execute(_make_input(
        shared_state={
            "ceo_initial_evaluation": {"verdict": "proceed"},
            "research_report": {"executive_summary": "Viable"},
            "prd": {"product_name": "TaskFlow"},
            "tech_architecture": {"overview": "Clean arch"},
            "task_breakdown": {"total_tasks": 20},
            "test_plan": {"strategy": "Comprehensive"},
        }
    ))

    assert result.status == "success"
    assert result.agent_type == "ceo_review"
    ExecutiveSummary.model_validate(result.output)
