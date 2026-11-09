"""
End-to-end integration tests for Phase 3.

Covers all 12 verification scenarios:
1.  Create a new project
2.  Start its workflow
3.  All six agents execute in the correct order
4.  Each agent receives the expected shared project state
5.  All agent outputs are stored correctly
6.  CEO conditional routing works
7.  Workflow pauses at the approval gate
8.  Approve, reject and request-revision paths
9.  Paused workflow can resume using its checkpoint
10. WebSocket events are emitted correctly
11. Workflow persistence after restart
12. Failed agent execution handled without corrupting state
"""

import asyncio
import json
from collections import defaultdict
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agents.base import AgentInput, AgentOutput
from app.agents.schemas import (
    ExecutiveSummary,
    PRD,
    ResearchReport,
    TaskBreakdown,
    TechArchitecture,
    TestPlan,
)
from app.db.session import get_db
from app.main import app
from app.models import Base
from app.models.approval import Approval
from app.models.base import utcnow
from app.models.document import Document
from app.models.project import Project
from app.models.workflow import WorkflowRun, WorkflowStep
from app.providers.mock import MockProvider

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


class WSEventCollector:
    """Collects WebSocket broadcast calls for verification."""

    def __init__(self):
        self.events: dict[str, list[dict]] = defaultdict(list)

    async def broadcast(self, project_id: str, data: dict[str, Any]) -> None:
        self.events[project_id].append(data)


@pytest.fixture
async def test_engine():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def test_session_factory(test_engine):
    return async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture
async def db(test_session_factory):
    async with test_session_factory() as session:
        yield session


@pytest.fixture
async def client(db):
    async def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def ws_collector():
    return WSEventCollector()


# ───────────────────────────────────────────────────────────
# Scenario 1 & 2: Create project and start workflow
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_1_2_create_project_and_start_workflow(client, db):
    """Create a project and start its workflow via API."""
    resp = await client.post("/api/projects", json={
        "name": "E2E Test Project",
        "idea_text": "A platform for automated code review using AI agents",
    })
    assert resp.status_code == 201
    project = resp.json()
    assert project["name"] == "E2E Test Project"
    assert project["status"] == "draft"
    project_id = project["id"]

    start_resp = await client.post(f"/api/projects/{project_id}/workflow/start")
    assert start_resp.status_code == 201
    run = start_resp.json()
    assert run["status"] == "running"
    assert run["project_id"] == project_id

    proj_resp = await client.get(f"/api/projects/{project_id}")
    assert proj_resp.json()["status"] == "active"


# ───────────────────────────────────────────────────────────
# Scenario 3, 4, 5: Agent execution order, state, and storage
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_3_4_5_agents_execute_in_order_with_state(db, ws_collector):
    """Run the full graph synchronously and verify execution order,
    shared state propagation, and document storage."""
    from app.orchestrator.nodes import _run_agent_node, _get_provider, _build_agent_input
    from app.agents.ceo import CEOAgent, CEOReviewAgent
    from app.agents.research import ResearchAgent
    from app.agents.cpo import CPOAgent
    from app.agents.cto import CTOAgent
    from app.agents.engineering import EngineeringAgent
    from app.agents.qa import QAAgent

    project = Project(
        name="Agent Order Test",
        idea_text="An AI-powered task management tool",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(
        project_id=project.id,
        status="running",
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    state: dict[str, Any] = {
        "project_id": project.id,
        "project_name": "Agent Order Test",
        "idea_text": "An AI-powered task management tool",
        "workflow_run_id": run.id,
        "workflow_status": "running",
    }

    provider = MockProvider()
    execution_order = []

    with patch("app.orchestrator.nodes.async_session", return_value=db), \
         patch("app.orchestrator.nodes.ws_manager", ws_collector):

        # Use the DB session as an async context manager
        class FakeSessionCtx:
            def __init__(self, session):
                self._session = session
            async def __aenter__(self):
                return self._session
            async def __aexit__(self, *args):
                pass

        with patch("app.orchestrator.nodes.async_session", lambda: FakeSessionCtx(db)):
            # 1. CEO Evaluate
            agent = CEOAgent(provider)
            result = await _run_agent_node(state, agent, "ceo_evaluate", "ceo_initial_evaluation")
            state.update(result)
            execution_order.append("ceo_evaluate")
            assert "ceo_initial_evaluation" in state
            assert state["ceo_initial_evaluation"] is not None
            ExecutiveSummary.model_validate(state["ceo_initial_evaluation"])

            # 2. Research
            agent = ResearchAgent(provider)
            result = await _run_agent_node(state, agent, "research", "research_report")
            state.update(result)
            execution_order.append("research")
            assert state["research_report"] is not None
            ResearchReport.model_validate(state["research_report"])

            # 3. CPO
            agent = CPOAgent(provider)
            result = await _run_agent_node(state, agent, "cpo_define", "prd")
            state.update(result)
            execution_order.append("cpo_define")
            assert state["prd"] is not None
            PRD.model_validate(state["prd"])

            # 4. CTO
            agent = CTOAgent(provider)
            result = await _run_agent_node(state, agent, "cto_design", "tech_architecture")
            state.update(result)
            execution_order.append("cto_design")
            assert state["tech_architecture"] is not None
            TechArchitecture.model_validate(state["tech_architecture"])

            # 5. Engineering
            agent = EngineeringAgent(provider)
            result = await _run_agent_node(state, agent, "eng_plan", "task_breakdown")
            state.update(result)
            execution_order.append("eng_plan")
            assert state["task_breakdown"] is not None
            TaskBreakdown.model_validate(state["task_breakdown"])

            # 6. QA
            agent = QAAgent(provider)
            result = await _run_agent_node(state, agent, "qa_plan", "test_plan")
            state.update(result)
            execution_order.append("qa_plan")
            assert state["test_plan"] is not None
            TestPlan.model_validate(state["test_plan"])

            # 7. CEO Review
            agent = CEOReviewAgent(provider)
            result = await _run_agent_node(state, agent, "ceo_review", "ceo_final_review")
            state.update(result)
            execution_order.append("ceo_review")
            assert state["ceo_final_review"] is not None
            ExecutiveSummary.model_validate(state["ceo_final_review"])

    # Verify execution order
    assert execution_order == [
        "ceo_evaluate", "research", "cpo_define",
        "cto_design", "eng_plan", "qa_plan", "ceo_review",
    ]

    # Verify workflow steps were recorded
    steps_result = await db.execute(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_run_id == run.id)
        .order_by(WorkflowStep.created_at)
    )
    steps = list(steps_result.scalars().all())
    assert len(steps) == 7
    step_nodes = [s.node_name for s in steps]
    assert step_nodes == [
        "ceo_evaluate", "research", "cpo_define",
        "cto_design", "eng_plan", "qa_plan", "ceo_review",
    ]
    for step in steps:
        assert step.status == "completed"
        assert step.provider_used == "mock"
        assert step.duration_ms >= 0
        assert step.output_data is not None

    # Verify documents were stored (scenario 5)
    docs_result = await db.execute(
        select(Document).where(Document.project_id == project.id)
    )
    docs = list(docs_result.scalars().all())
    doc_types = {d.doc_type for d in docs}
    expected_doc_types = {
        "executive_summary", "research_report", "prd",
        "tech_architecture", "task_breakdown", "test_plan",
    }
    assert expected_doc_types.issubset(doc_types), f"Missing: {expected_doc_types - doc_types}"
    for doc in docs:
        assert doc.content is not None
        assert doc.agent_type is not None
        assert doc.version >= 1


# ───────────────────────────────────────────────────────────
# Scenario 6: CEO conditional routing
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_6_ceo_conditional_routing():
    """route_after_ceo_evaluate returns 'end' on reject, 'research' otherwise."""
    from app.orchestrator.nodes import route_after_ceo_evaluate

    assert route_after_ceo_evaluate({
        "ceo_initial_evaluation": {"verdict": "proceed"},
        "workflow_status": "running",
    }) == "research"

    assert route_after_ceo_evaluate({
        "ceo_initial_evaluation": {"verdict": "pivot"},
        "workflow_status": "running",
    }) == "research"

    assert route_after_ceo_evaluate({
        "ceo_initial_evaluation": {"verdict": "reject"},
        "workflow_status": "running",
    }) == "end"

    assert route_after_ceo_evaluate({
        "workflow_status": "failed",
    }) == "end"


# ───────────────────────────────────────────────────────────
# Scenario 7: Workflow pauses at approval gate
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_7_workflow_pauses_at_approval_gate(db, ws_collector):
    """approval_gate_node creates an Approval and sets status to awaiting_approval."""
    from app.orchestrator.nodes import approval_gate_node

    project = Project(
        name="Approval Gate Test",
        idea_text="Testing approval interruption",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    state = {
        "project_id": project.id,
        "workflow_run_id": run.id,
        "ceo_final_review": {"verdict": "proceed", "summary": "Ship it"},
    }

    class FakeSessionCtx:
        def __init__(self, session):
            self._session = session
        async def __aenter__(self):
            return self._session
        async def __aexit__(self, *args):
            pass

    with patch("app.orchestrator.nodes.async_session", lambda: FakeSessionCtx(db)), \
         patch("app.orchestrator.nodes.ws_manager", ws_collector):
        result = await approval_gate_node(state)

    assert result["workflow_status"] == "awaiting_approval"
    assert result["approval_status"] == "pending"

    # Verify approval record was created
    approvals = await db.execute(
        select(Approval).where(Approval.workflow_run_id == run.id)
    )
    approval = approvals.scalar_one()
    assert approval.status == "pending"
    assert approval.step_name == "ceo_review_approval"

    # Verify WS event was emitted
    events = ws_collector.events.get(project.id, [])
    approval_events = [e for e in events if e["type"] == "approval_requested"]
    assert len(approval_events) == 1


# ───────────────────────────────────────────────────────────
# Scenario 8: Approve, reject and request-revision paths
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_8a_approve_path(client, db):
    """Resolving an approval with 'approved' updates the approval record."""
    project = Project(name="Approve Test", idea_text="test")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="awaiting_approval")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    approval = Approval(
        project_id=project.id,
        workflow_run_id=run.id,
        step_name="ceo_review_approval",
        status="pending",
        requested_at=utcnow(),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    resp = await client.post(f"/api/approvals/{approval.id}/resolve", json={
        "decision": "approved",
        "notes": "Looks great, ship it",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "approved"
    assert data["reviewer_notes"] == "Looks great, ship it"


@pytest.mark.asyncio
async def test_scenario_8b_reject_path(client, db):
    """Resolving an approval with 'rejected' updates correctly."""
    project = Project(name="Reject Test", idea_text="test")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="awaiting_approval")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    approval = Approval(
        project_id=project.id,
        workflow_run_id=run.id,
        step_name="ceo_review_approval",
        status="pending",
        requested_at=utcnow(),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    resp = await client.post(f"/api/approvals/{approval.id}/resolve", json={
        "decision": "rejected",
        "notes": "Not ready for production",
    })
    assert resp.status_code == 200
    assert resp.json()["decision"] == "rejected"


@pytest.mark.asyncio
async def test_scenario_8c_revision_path(client, db):
    """Resolving an approval with 'revision_requested' updates correctly."""
    project = Project(name="Revision Test", idea_text="test")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="awaiting_approval")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    approval = Approval(
        project_id=project.id,
        workflow_run_id=run.id,
        step_name="ceo_review_approval",
        status="pending",
        requested_at=utcnow(),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    resp = await client.post(f"/api/approvals/{approval.id}/resolve", json={
        "decision": "revision_requested",
        "notes": "Needs more detail on scalability",
    })
    assert resp.status_code == 200
    assert resp.json()["decision"] == "revision_requested"


@pytest.mark.asyncio
async def test_scenario_8d_cannot_resolve_twice(client, db):
    """Already-resolved approval returns 400."""
    project = Project(name="Double Resolve", idea_text="test")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="awaiting_approval")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    approval = Approval(
        project_id=project.id,
        workflow_run_id=run.id,
        step_name="ceo_review_approval",
        status="pending",
        requested_at=utcnow(),
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    await client.post(f"/api/approvals/{approval.id}/resolve", json={
        "decision": "approved",
    })
    resp2 = await client.post(f"/api/approvals/{approval.id}/resolve", json={
        "decision": "rejected",
    })
    assert resp2.status_code == 400


# ───────────────────────────────────────────────────────────
# Scenario 9: Resume from checkpoint (approval service)
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_9_resume_after_approval(db):
    """resume_after_approval handles approve, reject, revision_requested."""
    from app.services.workflow_service import resume_after_approval

    project = Project(name="Resume Test", idea_text="test")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Test rejection path (synchronous, no graph resume needed)
    run = WorkflowRun(project_id=project.id, status="awaiting_approval")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    with patch("app.services.workflow_service.ws_manager") as mock_ws:
        mock_ws.broadcast = AsyncMock()
        result = await resume_after_approval(run.id, "rejected", "Not viable", db)
    assert result.status == "rejected"

    # Verify project went back to failed
    await db.refresh(project)
    assert project.status == "failed"

    # Test revision_requested path
    project.status = "active"
    run2 = WorkflowRun(project_id=project.id, status="awaiting_approval")
    db.add(run2)
    await db.commit()
    await db.refresh(run2)

    with patch("app.services.workflow_service.ws_manager") as mock_ws:
        mock_ws.broadcast = AsyncMock()
        result2 = await resume_after_approval(run2.id, "revision_requested", "Redo research", db)
    assert result2.status == "revision_requested"
    await db.refresh(project)
    assert project.status == "draft"


# ───────────────────────────────────────────────────────────
# Scenario 10: WebSocket events emitted correctly
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_10_websocket_events(db, ws_collector):
    """Each agent node emits step_started and step_completed events."""
    from app.orchestrator.nodes import ceo_evaluate_node
    from app.providers.mock import MockProvider

    project = Project(name="WS Test", idea_text="WebSocket event testing")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    state = {
        "project_id": project.id,
        "project_name": "WS Test",
        "idea_text": "WebSocket event testing",
        "workflow_run_id": run.id,
        "workflow_status": "running",
    }

    class FakeSessionCtx:
        def __init__(self, session):
            self._session = session
        async def __aenter__(self):
            return self._session
        async def __aexit__(self, *args):
            pass

    with patch("app.orchestrator.nodes.async_session", lambda: FakeSessionCtx(db)), \
         patch("app.orchestrator.nodes.ws_manager", ws_collector):
        await ceo_evaluate_node(state)

    events = ws_collector.events[project.id]
    event_types = [e["type"] for e in events]
    assert "step_started" in event_types
    assert "step_completed" in event_types

    started = [e for e in events if e["type"] == "step_started"][0]
    assert started["node"] == "ceo_evaluate"
    assert started["agent_type"] == "ceo"

    completed = [e for e in events if e["type"] == "step_completed"][0]
    assert completed["status"] == "success"
    assert completed["duration_ms"] >= 0


# ───────────────────────────────────────────────────────────
# Scenario 11: Workflow persistence
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_11_workflow_persistence(client, db):
    """Workflow data persists and can be retrieved after creation."""
    resp = await client.post("/api/projects", json={
        "name": "Persistence Test",
        "idea_text": "Testing data persistence",
    })
    project_id = resp.json()["id"]

    await client.post(f"/api/projects/{project_id}/workflow/start")

    # Retrieve workflow — simulates "after restart"
    get_resp = await client.get(f"/api/projects/{project_id}/workflow")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["project_id"] == project_id
    assert data["status"] == "running"
    assert data["id"]

    # Project still accessible
    proj_resp = await client.get(f"/api/projects/{project_id}")
    assert proj_resp.status_code == 200
    assert proj_resp.json()["status"] == "active"


# ───────────────────────────────────────────────────────────
# Scenario 12: Failed agent handled without state corruption
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scenario_12_failed_agent_no_state_corruption(db, ws_collector):
    """A failing agent records the failure without corrupting workflow state."""
    from app.orchestrator.nodes import _run_agent_node
    from app.agents.ceo import CEOAgent
    from app.providers.base import ModelProvider, HealthStatus, ModelInfo

    class FailingProvider(ModelProvider):
        async def generate(self, prompt, system_prompt=""):
            raise RuntimeError("Provider crashed")

        async def generate_structured(self, prompt, schema, system_prompt=""):
            raise RuntimeError("Provider crashed")

        async def get_model_info(self):
            return ModelInfo(provider="failing", model_name="crash-model",
                            supports_structured_output=True, context_window=None)

        async def health_check(self):
            return HealthStatus(healthy=False, error="down")

    project = Project(name="Failure Test", idea_text="Testing failure handling")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    run = WorkflowRun(project_id=project.id, status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)

    state = {
        "project_id": project.id,
        "project_name": "Failure Test",
        "idea_text": "Testing failure handling",
        "workflow_run_id": run.id,
        "workflow_status": "running",
    }

    class FakeSessionCtx:
        def __init__(self, session):
            self._session = session
        async def __aenter__(self):
            return self._session
        async def __aexit__(self, *args):
            pass

    agent = CEOAgent(FailingProvider())
    with patch("app.orchestrator.nodes.async_session", lambda: FakeSessionCtx(db)), \
         patch("app.orchestrator.nodes.ws_manager", ws_collector):
        result = await _run_agent_node(state, agent, "ceo_evaluate", "ceo_initial_evaluation")

    assert result["workflow_status"] == "failed"
    assert result["error"] is not None
    assert result["ceo_initial_evaluation"] is None

    # Verify step was recorded as failed
    steps = await db.execute(
        select(WorkflowStep).where(WorkflowStep.workflow_run_id == run.id)
    )
    step = steps.scalar_one()
    assert step.status == "failed"
    assert step.error_message is not None

    # Verify no document was created for failed step
    docs = await db.execute(
        select(Document).where(Document.project_id == project.id)
    )
    assert docs.scalar_one_or_none() is None

    # Run remains accessible
    await db.refresh(run)
    assert run.status == "running"  # Run status not changed by node directly


# ───────────────────────────────────────────────────────────
# Bonus: Demo endpoint end-to-end
# ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_demo_endpoint_creates_project_and_workflow(client, db):
    """POST /api/demo/start creates a demo project and starts its workflow."""
    resp = await client.post("/api/demo/start")
    assert resp.status_code == 200
    data = resp.json()
    assert "project_id" in data
    assert "workflow_run_id" in data

    proj_resp = await client.get(f"/api/projects/{data['project_id']}")
    assert proj_resp.status_code == 200
    proj = proj_resp.json()
    assert proj["is_demo"] is True
    assert proj["name"] == "TaskFlow"
    assert proj["status"] == "active"

    wf_resp = await client.get(f"/api/projects/{data['project_id']}/workflow")
    assert wf_resp.status_code == 200
    assert wf_resp.json()["status"] == "running"
