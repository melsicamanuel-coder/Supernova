# SUPERNOVA — System Architecture

## Autonomous Multi-Agent Intelligence & Engineering Platform

**Version:** 2.0.0
**Status:** Architecture Review — Revised
**Date:** 2026-11-09

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [MVP Scope and Future Features](#2-mvp-scope-and-future-features)
3. [Repository Structure](#3-repository-structure)
4. [Database Entity Relationship Design](#4-database-entity-relationship-design)
5. [Agent Communication Architecture](#5-agent-communication-architecture)
6. [LangGraph Workflow Design](#6-langgraph-workflow-design)
7. [Human Approval System](#7-human-approval-system)
8. [Observability and Execution Tracing](#8-observability-and-execution-tracing)
9. [Agent Evaluation Framework](#9-agent-evaluation-framework)
10. [API Endpoint Specification](#10-api-endpoint-specification)
11. [Local Model Integration Design](#11-local-model-integration-design)
12. [Demo Mode](#12-demo-mode)
13. [Development Milestones](#13-development-milestones)
14. [Security Considerations](#14-security-considerations)
15. [Development Checklist](#15-development-checklist)

---

## 1. System Architecture Overview

### Design Principles

- **Local-first**: Runs entirely on the user's machine. No paid API keys, no cloud dependencies.
- **Structured communication**: Agents exchange typed Pydantic schemas through shared project state, not freeform text.
- **Model-independent**: Every agent interacts through a `ModelProvider` abstraction. No agent contains provider-specific logic. Mock, Ollama, and future providers are interchangeable.
- **Observable**: Every agent execution records its status, inputs, outputs, duration, provider, model, retry count, and errors. No fabricated metrics.
- **Resumable**: Workflow state is checkpointed after every step; interrupted runs resume from the last checkpoint.
- **Demonstrable**: A built-in demo mode launches a preconfigured startup idea and runs the full workflow with the mock provider. No model download or API key required.
- **MVP-first**: Build only the modules needed for a working first version. Defer advanced features (Ollama, semantic memory, Docker) until the core works end-to-end.

### System Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER (Browser)                             │
│                                                                     │
│   Dashboard │ New Project │ Agents │ Workflow │ Workspace │ Settings│
└──────────┬──────────────────────────────────────┬───────────────────┘
           │  HTTP (REST)                         │  WebSocket
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                           │
│                                                                     │
│   Pages ─── Components ─── Hooks ─── API Client ─── WS Client      │
│         TypeScript / React / Tailwind / shadcn/ui                   │
└──────────┬──────────────────────────────────────┬───────────────────┘
           │  HTTP :3000 → :8000                  │  WS :8000/ws
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI / Python)                     │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ REST API │  │  WebSocket   │  │  Services   │  │   Config     │  │
│  │ Routers  │  │  Manager     │  │  Layer      │  │   Manager    │  │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └──────────────┘  │
│       │               │                │                            │
│       ▼               ▼                ▼                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   AGENT ORCHESTRATOR                        │    │
│  │                                                             │    │
│  │  ┌─────────────────── LangGraph ───────────────────────┐   │    │
│  │  │                                                     │   │    │
│  │  │  ┌─────┐  ┌──────┐  ┌─────┐  ┌─────┐  ┌─────┐    │   │    │
│  │  │  │ CEO │→ │Rsrch │→ │ CPO │→ │ CTO │→ │ Eng │    │   │    │
│  │  │  └─────┘  └──────┘  └─────┘  └─────┘  └──┬──┘    │   │    │
│  │  │                                           │        │   │    │
│  │  │                                           ▼        │   │    │
│  │  │                                       ┌─────┐      │   │    │
│  │  │                                       │ QA  │      │   │    │
│  │  │                                       └──┬──┘      │   │    │
│  │  │                                          │         │   │    │
│  │  │                                          ▼         │   │    │
│  │  │  ┌──────────┐                     ┌───────────┐    │   │    │
│  │  │  │ Approval │◄────────────────────│CEO Review │    │   │    │
│  │  │  │   Gate   │                     └───────────┘    │   │    │
│  │  │  └──────────┘                                      │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│       │               │                │                            │
│       ▼               ▼                ▼                            │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐                │
│  │  Model   │  │  Evaluation  │  │   Storage       │                │
│  │ Provider │  │  Framework   │  │   (SQLite +     │                │
│  │ (Mock)   │  │              │  │    SQLAlchemy)  │                │
│  └──────────┘  └──────────────┘  └────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User submits project idea** → Frontend POSTs to `/api/projects` → Backend creates project record → Returns project ID.
2. **User starts workflow** → Frontend POSTs to `/api/projects/{id}/workflow/start` → Backend initializes LangGraph state graph → Opens WebSocket channel for live updates.
3. **Agent execution** → Orchestrator invokes agent node → Agent calls model provider through abstraction → Agent writes structured output to shared state → Execution trace recorded → Checkpoint saved → WebSocket event emitted.
4. **Approval gate** → Orchestrator pauses at approval node → WebSocket notifies frontend → User reviews outputs → User POSTs approval/rejection/revision → Workflow resumes, loops back, or terminates.
5. **Completion** → All outputs consolidated → CEO review generated → Project marked complete → Documents stored.

---

## 2. MVP Scope and Future Features

### MVP (First Working Version)

The MVP delivers a fully functional application that demonstrates the complete agent workflow with realistic outputs, without requiring any external model or paid service.

| Capability | Included |
|------------|----------|
| Next.js dashboard with space-themed UI | Yes |
| FastAPI backend with REST API | Yes |
| SQLite persistence via SQLAlchemy | Yes |
| MockProvider with realistic structured outputs | Yes |
| 6 specialised agents (CEO, Research, CPO, CTO, Engineering, QA) | Yes |
| LangGraph orchestration with checkpointing | Yes |
| Persistent workflow state (pause, resume, cancel) | Yes |
| Agent execution tracing (duration, provider, model, status, errors) | Yes |
| Human approval system (approve, reject, request revision) | Yes |
| Demo mode (one-click preconfigured demo) | Yes |
| Agent evaluation framework (schema validation, scoring) | Yes |
| WebSocket live updates during workflow | Yes |
| Project workspace (view all agent documents) | Yes |
| Workflow visualizer | Yes |
| Agent command center | Yes |
| Settings page (provider selection, health check) | Yes |

### Deferred to Post-MVP

| Feature | Reason |
|---------|--------|
| OllamaProvider | Requires model download; mock proves the architecture |
| AnthropicProvider / other cloud providers | Requires paid API keys |
| ChromaDB semantic memory | Adds dependency weight; SQLite memory sufficient for MVP |
| Local embedding models | Tied to ChromaDB |
| Memory Explorer page | Depends on semantic retrieval |
| Docker Compose | Not needed for local development |
| Playwright E2E tests | Backend integration tests cover critical paths first |
| Rate limiting middleware | Single-user local app |

### Build Order

Only files that serve a function in the MVP are created. No empty modules, no speculative interfaces, no placeholder files for deferred features.

---

## 3. Repository Structure

This is the MVP structure. Every file listed will contain working code.

```
supernova/
├── ARCHITECTURE.md
├── README.md
├── .env.example
├── .gitignore
│
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app, lifespan, CORS, router mount
│   │   ├── config.py                # Pydantic Settings from env vars
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py            # Aggregates all routers
│   │   │   ├── projects.py          # Project CRUD
│   │   │   ├── workflow.py          # Start, pause, resume, cancel
│   │   │   ├── agents.py            # Agent status, executions, outputs
│   │   │   ├── approvals.py         # Approval list, resolve
│   │   │   ├── documents.py         # Document retrieval
│   │   │   ├── settings_api.py      # Provider config, health check
│   │   │   └── websocket.py         # WebSocket endpoint
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Declarative base, ID mixin, timestamp mixin
│   │   │   ├── project.py           # Project
│   │   │   ├── workflow.py          # WorkflowRun, WorkflowStep
│   │   │   ├── agent.py             # AgentExecution
│   │   │   ├── document.py          # Document
│   │   │   ├── approval.py          # Approval
│   │   │   └── audit.py             # AuditLog
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── workflow.py
│   │   │   ├── agent.py
│   │   │   ├── document.py
│   │   │   ├── approval.py
│   │   │   ├── settings.py
│   │   │   └── websocket.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── project_service.py
│   │   │   ├── workflow_service.py
│   │   │   ├── approval_service.py
│   │   │   └── document_service.py
│   │   │
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # BaseAgent ABC
│   │   │   ├── ceo.py
│   │   │   ├── cpo.py
│   │   │   ├── cto.py
│   │   │   ├── research.py
│   │   │   ├── engineering.py
│   │   │   ├── qa.py
│   │   │   └── schemas.py           # All agent output Pydantic models
│   │   │
│   │   ├── orchestrator/
│   │   │   ├── __init__.py
│   │   │   ├── graph.py             # LangGraph StateGraph definition
│   │   │   ├── state.py             # SharedProjectState TypedDict
│   │   │   └── nodes.py             # Node functions + conditional edges
│   │   │
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # ModelProvider ABC
│   │   │   ├── mock.py              # MockProvider with canned responses
│   │   │   ├── registry.py          # Provider factory
│   │   │   └── mock_data/
│   │   │       ├── ceo_responses.json
│   │   │       ├── cpo_responses.json
│   │   │       ├── cto_responses.json
│   │   │       ├── research_responses.json
│   │   │       ├── engineering_responses.json
│   │   │       └── qa_responses.json
│   │   │
│   │   ├── evaluation/
│   │   │   ├── __init__.py
│   │   │   ├── evaluator.py         # Evaluation engine
│   │   │   ├── scoring.py           # Scoring functions per agent type
│   │   │   └── datasets/
│   │   │       └── default_eval.json # Default evaluation dataset
│   │   │
│   │   ├── websocket/
│   │   │   ├── __init__.py
│   │   │   └── manager.py           # Connection registry, broadcast, events
│   │   │
│   │   └── db/
│   │       ├── __init__.py
│   │       └── session.py           # Async SQLAlchemy session factory
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_providers.py
│       ├── test_agents.py
│       ├── test_workflow.py
│       ├── test_api.py
│       ├── test_approval.py
│       └── test_evaluation.py
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── components.json
│   │
│   ├── public/
│   │   └── supernova-logo.svg
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                    # Dashboard
│       │   ├── globals.css
│       │   ├── projects/
│       │   │   ├── new/
│       │   │   │   └── page.tsx            # New project form
│       │   │   └── [id]/
│       │   │       └── page.tsx            # Project workspace (docs + approval)
│       │   ├── workflow/
│       │   │   └── [id]/
│       │   │       └── page.tsx            # Workflow visualizer
│       │   ├── agents/
│       │   │   └── page.tsx                # Agent command center
│       │   └── settings/
│       │       └── page.tsx                # Settings
│       │
│       ├── components/
│       │   ├── ui/                         # shadcn/ui primitives
│       │   ├── layout/
│       │   │   ├── sidebar.tsx
│       │   │   └── header.tsx
│       │   ├── dashboard/
│       │   │   ├── project-card.tsx
│       │   │   ├── agent-activity.tsx
│       │   │   └── pending-approvals.tsx
│       │   ├── project/
│       │   │   ├── project-form.tsx
│       │   │   ├── document-viewer.tsx
│       │   │   └── approval-panel.tsx
│       │   ├── agents/
│       │   │   ├── agent-card.tsx
│       │   │   └── execution-log.tsx
│       │   └── workflow/
│       │       ├── workflow-graph.tsx
│       │       └── step-detail.tsx
│       │
│       ├── lib/
│       │   ├── api.ts                      # Typed fetch wrapper
│       │   ├── ws.ts                       # WebSocket client
│       │   └── utils.ts
│       │
│       ├── hooks/
│       │   ├── use-api.ts
│       │   ├── use-websocket.ts
│       │   └── use-project.ts
│       │
│       └── types/
│           ├── project.ts
│           ├── workflow.ts
│           ├── agent.ts
│           └── approval.ts
```

**File count: ~75** (down from ~120). Every file serves the MVP.

---

## 4. Database Entity Relationship Design

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────────┐
│      projects        │       │      workflow_runs       │
├─────────────────────┤       ├─────────────────────────┤
│ id           TEXT PK │◄──┐  │ id              TEXT PK  │
│ name         TEXT    │   │  │ project_id      TEXT FK ─┼──► projects.id
│ description  TEXT    │   │  │ status          TEXT     │
│ status       TEXT    │   │  │ current_node    TEXT     │
│ idea_text    TEXT    │   │  │ state_snapshot  JSON     │
│ config       JSON    │   │  │ error_message   TEXT     │
│ is_demo      BOOLEAN │   │  │ started_at      DATETIME │
│ created_at   DATETIME│   │  │ completed_at    DATETIME │
│ updated_at   DATETIME│   │  │ created_at      DATETIME │
└──────────┬──────────┘   │  └───────────┬─────────────┘
           │              │              │
           │              │              │  ┌─────────────────────────┐
           │              │              │  │     workflow_steps      │
           │              │              │  ├─────────────────────────┤
           │              │              ├─►│ id              TEXT PK │
           │              │              │  │ workflow_run_id TEXT FK  │
           │              │              │  │ agent_type      TEXT     │
           │              │              │  │ node_name       TEXT     │
           │              │              │  │ status          TEXT     │
           │              │              │  │ input_summary   JSON     │
           │              │              │  │ output_data     JSON     │
           │              │              │  │ error_message   TEXT     │
           │              │              │  │ duration_ms     INTEGER  │
           │              │              │  │ retry_count     INTEGER  │
           │              │              │  │ provider_used   TEXT     │
           │              │              │  │ model_used      TEXT     │
           │              │              │  │ token_usage     JSON     │
           │              │              │  │ started_at      DATETIME │
           │              │              │  │ completed_at    DATETIME │
           │              │              │  └─────────────────────────┘
           │              │
           │              │  ┌─────────────────────────┐
           │              │  │       documents          │
           │              │  ├─────────────────────────┤
           │              ├─►│ id              TEXT PK  │
           │              │  │ project_id      TEXT FK  │
           │              │  │ doc_type        TEXT     │
           │              │  │ title           TEXT     │
           │              │  │ content         JSON     │
           │              │  │ version         INTEGER  │
           │              │  │ agent_type      TEXT     │
           │              │  │ workflow_step_id TEXT FK  │
           │              │  │ created_at      DATETIME │
           │              │  └─────────────────────────┘
           │              │
           │              │  ┌─────────────────────────┐
           │              │  │       approvals          │
           │              │  ├─────────────────────────┤
           │              ├─►│ id              TEXT PK  │
           │              │  │ project_id      TEXT FK  │
           │              │  │ workflow_run_id TEXT FK   │
           │              │  │ step_name       TEXT     │
           │              │  │ status          TEXT     │
           │              │  │ decision        TEXT     │
           │              │  │ reviewer_notes  TEXT     │
           │              │  │ output_snapshot JSON     │
           │              │  │ requested_at    DATETIME │
           │              │  │ resolved_at     DATETIME │
           │              │  │ created_at      DATETIME │
           │              │  └─────────────────────────┘
           │
           │  ┌─────────────────────────────┐
           │  │        audit_log            │
           │  ├─────────────────────────────┤
           └─►│ id              TEXT PK     │
              │ project_id      TEXT FK     │
              │ event_type      TEXT        │
              │ actor           TEXT        │
              │ details         JSON        │
              │ timestamp       DATETIME    │
              └─────────────────────────────┘
```

### Changes from v1

- **Removed `agent_executions` table**: Merged into `workflow_steps`. Each workflow step now carries its own observability data (provider, model, token usage, duration, retries). One table, no ambiguity.
- **Removed `tasks` table**: Engineering tasks are stored as JSON within the `documents` table (doc_type = `task_breakdown`). No separate table until tasks need independent lifecycle management.
- **Removed `memories` table**: Deferred to post-MVP with ChromaDB integration.
- **Added `is_demo` to projects**: Flags demo-mode projects.
- **Added `decision` to approvals**: Distinguishes `approved`, `rejected`, `revision_requested`.
- **Added observability columns to `workflow_steps`**: `provider_used`, `model_used`, `token_usage`, `retry_count`.
- **Removed `checkpoint_data` BLOB from `workflow_runs`**: LangGraph manages its own checkpoint storage via `SqliteSaver`; we don't duplicate it.

### Table count: 5 (down from 10)

### Table Details

**projects**
- `status` enum: `draft`, `active`, `paused`, `completed`, `failed`
- `config` stores user-selected options: provider preference, model override
- `is_demo` marks projects created by demo mode

**workflow_runs**
- `status` enum: `pending`, `running`, `paused`, `awaiting_approval`, `completed`, `failed`, `cancelled`
- `state_snapshot` stores the full LangGraph shared state as JSON for API reads
- `current_node` tracks which agent is active (for display)

**workflow_steps**
- `status` enum: `pending`, `running`, `completed`, `failed`, `skipped`
- One row per agent execution within a workflow run
- `token_usage` is `{"input": N, "output": N}` when the provider reports it, `null` otherwise. Never fabricated.
- `input_summary` stores a compact summary of what the agent received (not the full state)

**documents**
- `doc_type` enum: `executive_summary`, `research_report`, `prd`, `tech_architecture`, `task_breakdown`, `test_plan`, `ceo_review`
- `content` stores the full structured agent output as JSON
- Versioned: a new row is created on re-generation, not overwritten

**approvals**
- `status` enum: `pending`, `approved`, `rejected`, `revision_requested`
- `decision` enum: `approved`, `rejected`, `revision_requested` (set when resolved)
- `output_snapshot` captures the full agent outputs at the time of the approval request

**audit_log**
- `event_type` enum: `project_created`, `workflow_started`, `workflow_completed`, `workflow_failed`, `agent_started`, `agent_completed`, `agent_failed`, `approval_requested`, `approval_resolved`, `error_occurred`
- `actor`: `system`, `user`, or an agent type name
- Append-only: no update or delete endpoints

### Indexes

- `projects`: index on `(status)`, `(created_at DESC)`
- `workflow_runs`: index on `(project_id, status)`
- `workflow_steps`: index on `(workflow_run_id)`, `(agent_type)`
- `documents`: index on `(project_id, doc_type)`
- `approvals`: index on `(project_id, status)`
- `audit_log`: index on `(project_id, timestamp DESC)`

---

## 5. Agent Communication Architecture

### Core Principle: Model Independence

No agent class imports or references any specific provider. The dependency chain is:

```
Agent ──depends-on──► ModelProvider ABC ◄──implements── MockProvider
                                        ◄──implements── OllamaProvider (post-MVP)
                                        ◄──implements── AnthropicProvider (future)
```

Agents receive a `ModelProvider` instance via constructor injection. The orchestrator resolves the provider from the registry and passes it. Agents never call `get_provider()` themselves.

### Shared Project State

Agents do not communicate peer-to-peer. Every agent reads from and writes to a single typed state object that flows through the LangGraph graph.

```python
class SharedProjectState(TypedDict):
    # Immutable context
    project_id: str
    project_name: str
    idea_text: str
    user_config: dict

    # Agent outputs — each populated by its respective agent
    ceo_initial_evaluation: Optional[ExecutiveSummary]
    research_report: Optional[ResearchReport]
    prd: Optional[PRD]
    tech_architecture: Optional[TechArchitecture]
    task_breakdown: Optional[TaskBreakdown]
    test_plan: Optional[TestPlan]
    ceo_final_review: Optional[ExecutiveSummary]

    # Workflow control
    current_agent: str
    workflow_status: str
    approval_status: Optional[str]      # pending / approved / rejected / revision_requested
    approval_notes: Optional[str]
    errors: list[dict]
    execution_history: list[dict]
```

### Agent Input / Output Schemas

```python
class AgentInput(BaseModel):
    project_id: str
    agent_type: str
    shared_state: dict
    retry_count: int = 0

class AgentOutput(BaseModel):
    agent_type: str
    status: Literal["success", "failure"]
    output: dict                         # Agent-specific structured output
    duration_ms: int
    provider_used: str
    model_used: str
    token_usage: Optional[dict] = None   # {"input": N, "output": N} if available
    error: Optional[str] = None
```

### Agent-Specific Output Schemas

**CEO → ExecutiveSummary**
```python
class ExecutiveSummary(BaseModel):
    verdict: Literal["proceed", "pivot", "reject"]
    confidence: float                    # 0.0–1.0
    summary: str
    strengths: list[str]
    risks: list[Risk]
    recommendations: list[str]
    market_assessment: str
    feasibility_score: float             # 0.0–1.0
```

**Research → ResearchReport**
```python
class ResearchReport(BaseModel):
    executive_summary: str
    findings: list[Finding]
    verified_facts: list[str]
    assumptions: list[Assumption]
    market_context: str
    competitor_landscape: str
    key_risks: list[str]
    data_gaps: list[str]
```

**CPO → PRD**
```python
class PRD(BaseModel):
    product_name: str
    vision: str
    target_users: list[UserPersona]
    problem_statements: list[str]
    functional_requirements: list[Requirement]
    non_functional_requirements: list[Requirement]
    user_stories: list[UserStory]
    feature_priorities: list[FeaturePriority]
    success_metrics: list[str]
    out_of_scope: list[str]
```

**CTO → TechArchitecture**
```python
class TechArchitecture(BaseModel):
    overview: str
    tech_stack: list[TechChoice]
    system_components: list[Component]
    data_model: list[Entity]
    api_design: list[Endpoint]
    infrastructure: InfrastructureSpec
    security_considerations: list[str]
    scalability_notes: str
    deployment_strategy: str
```

**Engineering → TaskBreakdown**
```python
class TaskBreakdown(BaseModel):
    total_tasks: int
    estimated_hours: float
    phases: list[Phase]
    tasks: list[EngineeringTask]
    critical_path: list[str]
    risk_areas: list[str]
```

**QA → TestPlan**
```python
class TestPlan(BaseModel):
    strategy: str
    test_categories: list[TestCategory]
    test_scenarios: list[TestScenario]
    edge_cases: list[str]
    coverage_assessment: str
    risk_based_priorities: list[str]
    automation_recommendations: list[str]
```

### Communication Flow

Each agent:
1. Receives a `SharedProjectState` dict and a `ModelProvider` instance
2. Reads only the fields relevant to its role
3. Calls `provider.generate_structured()` with its prompt and output schema
4. Validates the response against its Pydantic schema
5. Returns an `AgentOutput` containing the structured output plus execution metadata
6. The orchestrator writes the output to the shared state, records the execution trace, and checkpoints

---

## 6. LangGraph Workflow Design

### State Graph

```
                    ┌───────────────┐
                    │     START     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  ceo_evaluate │
                    └───────┬───────┘
                            │
                        ┌───┴───┐
                        │ pass? │  Conditional: verdict != "reject"
                        └───┬───┘
                       yes/ │ \no
                      ┌─────┘  └────────────────────┐
                      ▼                              ▼
              ┌───────────────┐              ┌──────────────┐
              │   research    │              │   REJECTED   │
              └───────┬───────┘              │     END      │
                      │                      └──────────────┘
                      ▼
              ┌───────────────┐
              │   cpo_define  │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │  cto_design   │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │   eng_plan    │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │    qa_plan    │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │  ceo_review   │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │   approval    │  Human-in-the-loop gate
              │     gate      │
              └───────┬───────┘
                      │
                 ┌────┴────┐
                 │decision?│
                 └────┬────┘
           approved/  │  \rejected/revision
              ┌───────┘   └──────────┐
              ▼                      ▼
      ┌──────────────┐      ┌──────────────┐
      │  COMPLETED   │      │   REVISION   │
      │     END      │      │  (back to    │
      └──────────────┘      │ ceo_evaluate)│
                            └──────────────┘
```

### Graph Construction

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

workflow = StateGraph(SharedProjectState)

workflow.add_node("ceo_evaluate", ceo_evaluate_node)
workflow.add_node("research", research_node)
workflow.add_node("cpo_define", cpo_define_node)
workflow.add_node("cto_design", cto_design_node)
workflow.add_node("eng_plan", eng_plan_node)
workflow.add_node("qa_plan", qa_plan_node)
workflow.add_node("ceo_review", ceo_review_node)
workflow.add_node("approval_gate", approval_gate_node)

workflow.set_entry_point("ceo_evaluate")

workflow.add_conditional_edges(
    "ceo_evaluate",
    route_after_ceo_evaluate,
    {"research": "research", "end": END}
)
workflow.add_edge("research", "cpo_define")
workflow.add_edge("cpo_define", "cto_design")
workflow.add_edge("cto_design", "eng_plan")
workflow.add_edge("eng_plan", "qa_plan")
workflow.add_edge("qa_plan", "ceo_review")
workflow.add_edge("ceo_review", "approval_gate")
workflow.add_conditional_edges(
    "approval_gate",
    route_after_approval,
    {"end": END, "revise": "ceo_evaluate"}
)

checkpointer = AsyncSqliteSaver.from_conn_string("sqlite+aiosqlite:///supernova_checkpoints.db")
app = workflow.compile(checkpointer=checkpointer, interrupt_before=["approval_gate"])
```

### Node Function Pattern

```python
async def ceo_evaluate_node(state: SharedProjectState) -> dict:
    started_at = datetime.utcnow()

    agent = CEOAgent(provider=get_provider())
    agent_input = AgentInput(
        project_id=state["project_id"],
        agent_type="ceo",
        shared_state=dict(state),
        retry_count=0
    )

    result: AgentOutput = await agent.execute(agent_input)

    # Record execution trace
    await record_step(
        workflow_run_id=...,
        agent_type="ceo",
        node_name="ceo_evaluate",
        status=result.status,
        output_data=result.output,
        duration_ms=result.duration_ms,
        provider_used=result.provider_used,
        model_used=result.model_used,
        token_usage=result.token_usage,
        error=result.error
    )

    # Emit WebSocket event
    await ws_manager.broadcast(state["project_id"], {
        "event": "agent_completed",
        "agent": "ceo",
        "node": "ceo_evaluate",
        "status": result.status,
        "duration_ms": result.duration_ms
    })

    return {
        "ceo_initial_evaluation": result.output,
        "current_agent": "ceo",
        "execution_history": state["execution_history"] + [{
            "agent": "ceo",
            "node": "ceo_evaluate",
            "status": result.status,
            "duration_ms": result.duration_ms,
            "completed_at": datetime.utcnow().isoformat()
        }]
    }
```

### Retry and Failure Handling

- **Max retries**: 2 per agent node (3 total attempts)
- **Backoff**: 1s, 2s
- **On exhausted retries**: Mark step as `failed`, record error, emit WebSocket event, set workflow status to `failed`
- **On provider failure**: If `SUPERNOVA_FALLBACK_TO_MOCK=true`, retry with MockProvider
- **State on failure**: The last successful checkpoint is preserved; the user can restart the workflow from the failed step via the API

### Checkpointing

- LangGraph's `AsyncSqliteSaver` stores the full state after each node completes
- Checkpoints are keyed by `thread_id` (the project ID)
- `interrupt_before=["approval_gate"]` pauses the graph before entering the approval node, giving the user control
- Resuming from checkpoint: call `app.ainvoke(None, config)` with the updated approval state

---

## 7. Human Approval System

### Approval States

```
                    ┌──────────┐
  Workflow reaches  │          │
  approval_gate ──► │ PENDING  │
                    │          │
                    └────┬─────┘
                         │
              ┌──────────┼──────────────┐
              │          │              │
              ▼          ▼              ▼
       ┌──────────┐ ┌──────────┐ ┌────────────────┐
       │ APPROVED │ │ REJECTED │ │    REVISION    │
       └────┬─────┘ └────┬─────┘ │   REQUESTED    │
            │             │       └───────┬────────┘
            ▼             ▼               ▼
       Workflow      Workflow        Workflow restarts
       completes     terminates      from ceo_evaluate
                                     with revision notes
                                     injected into state
```

### Approval Record

When the workflow reaches the approval gate:

1. The orchestrator creates an `Approval` record with status `pending`
2. The `output_snapshot` captures all agent outputs at that moment
3. A WebSocket event notifies the frontend
4. The LangGraph graph is paused via `interrupt_before`

### Resolution Options

**Approve**
- Sets `decision = "approved"`, `status = "approved"`
- Records `reviewer_notes` and `resolved_at`
- Resumes the workflow → graph proceeds to END → project marked `completed`

**Reject**
- Sets `decision = "rejected"`, `status = "rejected"`
- Records `reviewer_notes` and `resolved_at`
- Resumes the workflow → graph proceeds to END → project marked `failed`

**Request Revision**
- Sets `decision = "revision_requested"`, `status = "revision_requested"`
- Records `reviewer_notes` (what to change) and `resolved_at`
- Resumes the workflow → graph loops back to `ceo_evaluate`
- The revision notes are injected into `SharedProjectState` as `approval_notes`
- Agents can read `approval_notes` to adjust their outputs in the next pass
- A new set of workflow steps is created for the revision pass

### Approval History

Every approval is a separate row. Re-running a workflow through revision creates a new approval record. The full approval history is queryable per project, showing the progression of decisions.

### API

```
POST /api/approvals/{id}/resolve
{
    "decision": "approved" | "rejected" | "revision_requested",
    "notes": "optional reviewer notes"
}
```

---

## 8. Observability and Execution Tracing

### What Is Tracked

Every agent execution records the following in the `workflow_steps` table:

| Field | Source | Notes |
|-------|--------|-------|
| `agent_type` | Node function | `ceo`, `research`, `cpo`, `cto`, `engineering`, `qa` |
| `node_name` | Node function | `ceo_evaluate`, `ceo_review`, etc. |
| `status` | Agent result | `completed` or `failed` |
| `input_summary` | Node function | Compact: which state fields were non-null at invocation |
| `output_data` | Agent result | Full structured output JSON |
| `duration_ms` | Agent timing | Wall-clock time of the `agent.execute()` call |
| `provider_used` | Agent result | `mock` or `ollama` |
| `model_used` | Agent result | `mock-structured` or `llama3.1:8b` |
| `token_usage` | Provider | `{"input": N, "output": N}` only when the provider reports it. MockProvider returns `null`. OllamaProvider returns counts from the API response. Never estimated or fabricated. |
| `retry_count` | Node function | How many retries occurred before success or final failure |
| `error_message` | Agent result | Error string if failed, `null` otherwise |
| `started_at` | Node function | UTC timestamp when the node began |
| `completed_at` | Node function | UTC timestamp when the node finished |

### What Is NOT Tracked

- Token usage when the provider does not report it (MockProvider returns `null`)
- Intermediate LLM reasoning or chain-of-thought
- Internal provider latency breakdown
- Estimated costs

### Audit Log

In addition to per-step execution data, the `audit_log` table records lifecycle events:

- `workflow_started` — with workflow run ID
- `agent_started` — with agent type and node name
- `agent_completed` — with agent type, duration, status
- `agent_failed` — with agent type, error message, retry count
- `approval_requested` — with approval ID
- `approval_resolved` — with decision and notes
- `workflow_completed` — with total duration
- `workflow_failed` — with error details

### WebSocket Events

Live events emitted during workflow execution:

```json
{"event": "workflow_started",     "data": {"run_id": "...", "project_id": "..."}}
{"event": "agent_started",        "data": {"agent": "ceo", "node": "ceo_evaluate", "step": 1}}
{"event": "agent_completed",      "data": {"agent": "ceo", "status": "success", "duration_ms": 1200}}
{"event": "agent_failed",         "data": {"agent": "ceo", "error": "...", "retry_count": 1}}
{"event": "approval_requested",   "data": {"approval_id": "...", "step": "final_review"}}
{"event": "workflow_completed",   "data": {"run_id": "...", "total_duration_ms": 8400}}
{"event": "workflow_failed",      "data": {"run_id": "...", "error": "..."}}
```

### Frontend Display

The Agent Command Center page shows:
- Per-agent execution history (sortable table)
- Status, duration, provider, model for each execution
- Token usage when available (blank when not)
- Error details expandable inline
- Retry count badge

The Workflow Visualizer shows:
- Each node colored by status (grey=pending, blue=running, green=completed, red=failed)
- Duration label on completed nodes
- Current position indicator (pulsing node)

---

## 9. Agent Evaluation Framework

### Purpose

Measure the quality of agent outputs to verify that the mock provider produces credible data and that real providers (Ollama, future) produce useful results. The evaluation framework works with any provider — it evaluates outputs, not prompts or models.

### Evaluation Dimensions

Each agent type has specific evaluation criteria:

**CEO (ExecutiveSummary)**
- Schema validation: output matches Pydantic model
- Completeness: all required fields populated, `strengths` and `risks` non-empty
- Coherence: `verdict` aligns with `feasibility_score` (reject ↔ low score, proceed ↔ high score)
- Actionability: `recommendations` list is non-empty

**Research (ResearchReport)**
- Schema validation
- Completeness: findings, assumptions, and data_gaps populated
- Separation: `verified_facts` and `assumptions` have no overlap
- Coverage: at least one finding per major aspect of the idea

**CPO (PRD)**
- Schema validation
- Requirement coverage: functional and non-functional requirements present
- User story quality: each story has `as_a`, `i_want`, `so_that` fields
- Priority coverage: feature priorities span multiple priority levels
- Traceability: requirements reference user problems

**CTO (TechArchitecture)**
- Schema validation
- Architecture completeness: tech stack, components, data model, API design all populated
- Component coherence: components reference declared tech stack choices
- Security: `security_considerations` non-empty

**Engineering (TaskBreakdown)**
- Schema validation
- Task dependency validity: all dependency references resolve to existing task IDs
- No circular dependencies
- Phase coverage: tasks span multiple phases
- Estimation sanity: `estimated_hours` > 0 and within plausible range

**QA (TestPlan)**
- Schema validation
- Requirement coverage: test scenarios reference requirements from the PRD
- Edge case coverage: `edge_cases` non-empty
- Category diversity: multiple `test_categories`

### Evaluation Dataset

A default evaluation dataset (`backend/app/evaluation/datasets/default_eval.json`) contains 2–3 sample project ideas with expected evaluation benchmarks:

```json
{
  "evaluations": [
    {
      "idea": "A task management app for distributed remote teams with timezone-aware scheduling",
      "expected_min_scores": {
        "ceo": {"completeness": 0.8, "coherence": 0.7},
        "research": {"completeness": 0.7, "separation": 0.9},
        "cpo": {"requirement_coverage": 0.8, "user_story_quality": 0.7},
        "cto": {"architecture_completeness": 0.8},
        "engineering": {"dependency_validity": 1.0},
        "qa": {"requirement_coverage": 0.7}
      }
    }
  ]
}
```

### Scoring

Each evaluation criterion returns a score from 0.0 to 1.0:

- **1.0** — Fully satisfies the criterion
- **0.7–0.9** — Mostly satisfies, minor gaps
- **0.4–0.6** — Partially satisfies, notable gaps
- **0.0–0.3** — Does not satisfy

The evaluation engine runs all criteria for a given agent output and returns an `EvaluationReport`:

```python
class EvaluationReport(BaseModel):
    agent_type: str
    scores: dict[str, float]          # criterion_name → score
    overall_score: float              # weighted average
    passed: bool                      # overall_score >= threshold (default 0.7)
    details: list[EvaluationDetail]   # per-criterion notes
```

### Usage

The evaluation framework is invoked:

1. **Automatically after each workflow run** (optional, configurable) — stores results alongside the workflow for review
2. **On demand via API** — `POST /api/projects/{id}/evaluate` runs evaluation on the project's current documents
3. **In tests** — `test_evaluation.py` runs the default dataset against the MockProvider and asserts minimum scores

---

## 10. API Endpoint Specification

### Base URL: `/api`

### Projects (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects` | Create project |
| GET | `/projects` | List projects (query: `status`, `limit`, `offset`) |
| GET | `/projects/{id}` | Get project detail |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |

### Workflow (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{id}/workflow/start` | Start workflow |
| POST | `/projects/{id}/workflow/pause` | Pause workflow |
| POST | `/projects/{id}/workflow/resume` | Resume workflow |
| POST | `/projects/{id}/workflow/cancel` | Cancel workflow |
| GET | `/projects/{id}/workflow` | Get current workflow run with steps |

### Agents (3 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List all agents with aggregated status |
| GET | `/agents/{type}` | Get agent detail with recent executions |
| GET | `/projects/{id}/agents/{type}/output` | Get agent output for a project |

### Documents (2 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/documents` | List all documents for project |
| GET | `/projects/{id}/documents/{doc_type}` | Get latest document by type |

### Approvals (3 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/approvals` | List approvals (query: `status`, `project_id`) |
| GET | `/approvals/{id}` | Get approval detail with output snapshot |
| POST | `/approvals/{id}/resolve` | Resolve: approve, reject, or request revision |

### Evaluation (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/{id}/evaluate` | Run evaluation on current documents |

### Settings (2 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get current configuration |
| GET | `/settings/health` | Check active provider health |

### Demo (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/demo/start` | Create demo project and start workflow |

### WebSocket (1 endpoint)

| Path | Description |
|------|-------------|
| `ws://localhost:8000/ws/{project_id}` | Live workflow events |

### Health (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Backend health check |

**Total: 24 endpoints** (down from 40+)

---

## 11. Local Model Integration Design

### Provider Interface

```python
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import TypeVar, Type

T = TypeVar("T", bound=BaseModel)

class ModelProvider(ABC):

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a freeform text response."""
        ...

    @abstractmethod
    async def generate_structured(
        self, prompt: str, schema: Type[T], system_prompt: str = ""
    ) -> T:
        """Generate a response conforming to a Pydantic schema."""
        ...

    @abstractmethod
    async def get_model_info(self) -> ModelInfo:
        """Return provider and model metadata."""
        ...

    @abstractmethod
    async def health_check(self) -> HealthStatus:
        """Check if the provider is available."""
        ...


class ModelInfo(BaseModel):
    provider: str
    model_name: str
    supports_structured_output: bool
    context_window: Optional[int] = None

class HealthStatus(BaseModel):
    healthy: bool
    latency_ms: Optional[int] = None
    error: Optional[str] = None
```

### Provider Independence Rules

1. **No agent may import any provider class directly.** Agents receive `ModelProvider` via constructor.
2. **No provider-specific error types in agent code.** Agents catch `Exception` from provider calls and wrap in `AgentOutput(status="failure")`.
3. **The provider registry resolves providers by name.** The orchestrator calls `registry.get(config.provider)` once and passes the instance to all agents.
4. **Provider-specific logic stays in the provider module.** JSON parsing retries for Ollama, latency simulation for Mock — all internal to their respective classes.

### MockProvider

Returns pre-authored, realistic structured outputs that match every agent's schema. Simulates latency (configurable, default 800ms–2000ms random).

```
MockProvider
  │
  ├── generate()
  │   └── Returns template text with project name interpolated
  │
  ├── generate_structured(prompt, schema, system_prompt)
  │   └── Determines agent type from system_prompt or schema class name
  │       Loads from mock_data/{agent_type}_responses.json
  │       Selects a response template
  │       Interpolates {{project_name}} and {{idea_text}} from prompt
  │       Validates against requested schema
  │       Simulates latency
  │       Returns: fully typed Pydantic model
  │       token_usage: returns null (mock has no real tokens)
  │
  ├── get_model_info()
  │   └── Returns ModelInfo(provider="mock", model_name="mock-structured", ...)
  │
  └── health_check()
      └── Always returns HealthStatus(healthy=True)
```

### Provider Registry

```python
class ProviderRegistry:
    _providers: dict[str, Type[ModelProvider]]

    def register(self, name: str, cls: Type[ModelProvider]) -> None: ...
    def get(self, name: str, **kwargs) -> ModelProvider: ...
    def list_available(self) -> list[str]: ...
```

At startup, the registry is populated:
```python
registry = ProviderRegistry()
registry.register("mock", MockProvider)
# Post-MVP:
# registry.register("ollama", OllamaProvider)
```

### Configuration

```
SUPERNOVA_PROVIDER=mock
SUPERNOVA_DEFAULT_MODEL=mock-structured
SUPERNOVA_MOCK_LATENCY_MIN_MS=800
SUPERNOVA_MOCK_LATENCY_MAX_MS=2000
SUPERNOVA_MAX_RETRIES=2
SUPERNOVA_REQUEST_TIMEOUT_S=120
SUPERNOVA_FALLBACK_TO_MOCK=true
```

### Post-MVP: OllamaProvider

Will be added when the core MVP works. Design:

```
OllamaProvider
  ├── Base URL: http://localhost:11434 (configurable via SUPERNOVA_OLLAMA_URL)
  ├── generate() → POST /api/generate
  ├── generate_structured() → POST /api/generate with format: "json"
  │   Schema included in system prompt, response validated against Pydantic model
  │   Retry with correction prompt on validation failure
  ├── get_model_info() → POST /api/show
  └── health_check() → GET /api/tags
```

### Post-MVP: Future Providers

The `ModelProvider` ABC is designed to accommodate cloud providers:

```python
# Future: register additional providers
registry.register("anthropic", AnthropicProvider)
registry.register("openai", OpenAIProvider)
```

No changes to agents or orchestrator required — only a new provider class and registration.

---

## 12. Demo Mode

### Purpose

A user can experience the full SUPERNOVA workflow immediately, without configuring anything, downloading a model, or writing a project idea. One click launches a demo.

### Behaviour

1. User clicks "Launch Demo" on the dashboard or navigates to the demo endpoint
2. Backend creates a project with:
   - `name`: "TaskFlow — Remote Team Collaboration Platform"
   - `idea_text`: A 200-word startup pitch for a task management app (pre-authored)
   - `is_demo`: `true`
   - `config.provider`: `mock` (forced, regardless of global setting)
3. Backend immediately starts the workflow
4. Frontend navigates to the project workspace
5. WebSocket events stream in as each agent completes
6. Mock latency (800ms–2000ms per agent) makes the progression visible
7. All 7 agent steps complete, producing realistic documents
8. Workflow pauses at the approval gate
9. User reviews the outputs and approves, rejects, or requests revision
10. On approval, the project completes with full documents available in the workspace

### Demo Data

The pre-authored demo idea is stored in the MockProvider's data directory alongside the response templates. It is carefully written to produce high-quality outputs across all agents:

- CEO finds the idea strategically viable with moderate market risk
- Research identifies 3 competitors, 5 assumptions, and 2 data gaps
- CPO defines 3 user personas, 12 functional requirements, and 8 user stories
- CTO recommends a specific tech stack with 5 system components
- Engineering breaks the plan into 4 phases with 18 tasks and a critical path
- QA defines 20 test scenarios across 4 categories

### API

```
POST /api/demo/start
Response: { project_id, workflow_run_id }
```

### Frontend

The dashboard includes a prominent "Launch Demo" card when no projects exist. It is also accessible from the new project page as a pre-filled template.

---

## 13. Development Milestones

### Phase 1: Architecture ✓
**Status:** Complete
**Deliverables:** This document.

---

### Phase 2: Foundation
**Goal:** Backend and frontend skeletons that start, connect, and persist data.

**Backend:**
- Initialize Python project (pyproject.toml, dependencies)
- FastAPI app with health endpoint, CORS
- Pydantic Settings from env vars
- SQLAlchemy models for all 5 tables
- Alembic migration
- ModelProvider ABC + MockProvider with all 6 response templates
- Provider registry

**Frontend:**
- Next.js with TypeScript, Tailwind, shadcn/ui
- Space-themed dark palette (CSS custom properties)
- Layout shell: sidebar, header, content area
- All page routes with skeleton content
- Typed API client, WebSocket client
- TypeScript types matching backend schemas

**Acceptance criteria:**
- `pytest` passes, `/health` returns 200
- MockProvider returns valid structured data for all 6 agent types
- `npm run dev` starts, layout renders, all routes reachable
- Alembic migration creates all tables in fresh SQLite

**Effort:** 3–4 days

---

### Phase 3: Agent System + Orchestration
**Goal:** Full workflow runs end-to-end with MockProvider.

**Agents:**
- BaseAgent ABC with execute(), prompt construction, output validation
- All 6 agent implementations
- Agent prompt templates

**Orchestration:**
- SharedProjectState TypedDict
- LangGraph StateGraph with all nodes, edges, conditional routing
- AsyncSqliteSaver checkpointing
- Approval gate with interrupt_before
- Retry with fallback

**Services + API:**
- Workflow service: start, pause, resume, cancel
- Approval service: create, resolve (approve, reject, request revision)
- Document service: store and retrieve agent outputs
- WebSocket manager with event broadcast
- All workflow, agent, document, and approval API endpoints

**Acceptance criteria:**
- Full workflow runs end-to-end with MockProvider, producing 7 documents
- Workflow pauses at approval gate and resumes correctly for all 3 decisions
- Interrupted workflow resumes from checkpoint
- WebSocket emits events at each step
- All agent outputs validate against Pydantic schemas
- Execution tracing data recorded in workflow_steps

**Effort:** 5–6 days

---

### Phase 4: Frontend Implementation
**Goal:** All pages functional, connected to live backend.

**Dashboard:**
- Active projects with status indicators
- Agent activity feed (WebSocket-driven)
- Pending approvals widget
- "Launch Demo" card

**New Project:**
- Project creation form
- Workflow start button

**Project Workspace:**
- Tabbed document viewer (all 7 document types)
- Approval panel (review outputs, approve/reject/revision)
- Workflow status indicator

**Workflow Visualizer:**
- Graph rendering with nodes and edges
- Node status coloring (pending/active/completed/failed)
- Duration labels on completed nodes
- Step detail panel on click

**Agent Command Center:**
- Agent cards with status, execution count, last run
- Execution log table with duration, provider, model, status
- Output viewer

**Settings:**
- Provider display
- Provider health check
- Configuration display

**Acceptance criteria:**
- All pages render with real data from backend
- Live WebSocket updates during workflow execution
- Full approval flow works from UI
- Demo mode launches and completes from dashboard
- Responsive at desktop width
- Space-themed dark design, no garish neon

**Effort:** 5–6 days

---

### Phase 5: Evaluation + Demo + Testing
**Goal:** Evaluation framework validates outputs; demo mode polished; tests cover critical paths.

**Evaluation:**
- Evaluation engine with per-agent scoring functions
- Default evaluation dataset
- API endpoint to trigger evaluation
- Evaluation results stored alongside project

**Demo:**
- Pre-authored demo project idea
- One-click demo launch from frontend
- Realistic end-to-end demo experience

**Testing:**
- Backend unit tests: providers, agents, evaluation scoring
- Backend integration tests: full workflow, API endpoints, approval flow
- Offline test: full workflow with SUPERNOVA_PROVIDER=mock and no network

**Acceptance criteria:**
- MockProvider outputs score ≥ 0.7 on default evaluation dataset
- Demo mode runs from click to completed project without errors
- Test suite passes with no external dependencies
- All critical paths have test coverage

**Effort:** 3–4 days

---

### Phase 6: Documentation + Polish
**Goal:** README, setup guide, API docs, final UX polish.

**Deliverables:**
- README.md with overview, screenshots, quick start, demo instructions
- .env.example with all configuration options documented
- FastAPI auto-generated docs at `/docs`
- Final UI polish pass

**Acceptance criteria:**
- A new developer can clone, install, and run the demo following only README.md
- API docs browsable at `/docs`

**Effort:** 1–2 days

---

**Total estimated effort: 18–23 days** (down from 23–30)

---

## 14. Security Considerations

### Input Sanitization
- All user input validated through Pydantic schemas before processing
- Project idea text: max 10,000 characters, stripped of control characters
- Project names: max 200 characters, alphanumeric + common punctuation
- API query parameters: typed and bounded (limit max 100, offset non-negative)
- No raw SQL — all queries through SQLAlchemy ORM

### Agent Sandboxing
- Agents have NO filesystem access, NO shell access, NO network access
- Agents receive only their input schema and return only their output schema
- The model provider is the only external call an agent can make
- Agent outputs are validated against strict Pydantic schemas; unexpected fields are dropped
- No agent can modify another agent's output directly — all writes go through shared state

### Approval Gates
- Consequential workflow transitions require human approval
- Approval state is persisted — cannot be bypassed by replaying requests
- Approval records include: decision, timestamp, what the reviewer saw, and any notes
- Revision requests loop the workflow back through all agents with notes

### Configuration Security
- No credentials stored in code or committed to version control
- All secrets via environment variables
- `.env` file in `.gitignore`
- `.env.example` contains only placeholder values

### CORS
- Frontend origin explicitly whitelisted (default: `http://localhost:3000`)
- No wildcard CORS

### Audit Trail
- Every significant action logged to `audit_log` table
- Logs include: event type, actor, timestamp, and relevant details
- Audit log is append-only — no update or delete endpoints

### Data Isolation
- Each project's data is isolated by `project_id` foreign keys
- No cross-project data leakage in queries

---

## 15. Development Checklist

### Phase 1: Architecture
- [x] Analyze project requirements
- [x] Design system architecture
- [x] Define MVP scope and deferred features
- [x] Define repository structure
- [x] Design database schema (5 tables)
- [x] Define agent communication contracts
- [x] Design LangGraph workflow
- [x] Design human approval system
- [x] Design observability and execution tracing
- [x] Design agent evaluation framework
- [x] Specify API endpoints (24 endpoints)
- [x] Design model provider abstraction
- [x] Design demo mode
- [x] Document security considerations
- [x] Create development checklist
- [ ] **Architecture review and approval**

### Phase 2: Foundation
- [ ] Initialize git repository
- [ ] Create `.gitignore`, `.env.example`
- [ ] **Backend**
  - [ ] `pyproject.toml` with dependencies
  - [ ] FastAPI app (`main.py`) with health endpoint and CORS
  - [ ] Configuration loading (`config.py`)
  - [ ] SQLAlchemy base, models for all 5 tables
  - [ ] Alembic setup + initial migration
  - [ ] Async session factory (`db/session.py`)
- [ ] **Provider**
  - [ ] `ModelProvider` ABC (`providers/base.py`)
  - [ ] `MockProvider` (`providers/mock.py`)
  - [ ] Mock response JSON files (6 agents × 2 templates each)
  - [ ] `ProviderRegistry` (`providers/registry.py`)
- [ ] **Frontend**
  - [ ] Next.js + TypeScript + Tailwind + shadcn/ui
  - [ ] Space-themed CSS custom properties
  - [ ] Layout: sidebar + header
  - [ ] All page routes with skeleton content
  - [ ] API client (`lib/api.ts`)
  - [ ] WebSocket client (`lib/ws.ts`)
  - [ ] TypeScript types
- [ ] **Verify**
  - [ ] `pytest` passes
  - [ ] MockProvider returns valid data for all 6 agents
  - [ ] Frontend starts and all routes reachable

### Phase 3: Agent System + Orchestration
- [ ] **Agents**
  - [ ] `BaseAgent` ABC
  - [ ] `CEOAgent`
  - [ ] `ResearchAgent`
  - [ ] `CPOAgent`
  - [ ] `CTOAgent`
  - [ ] `EngineeringAgent`
  - [ ] `QAAgent`
  - [ ] Agent output schemas (`agents/schemas.py`)
- [ ] **Orchestration**
  - [ ] `SharedProjectState` TypedDict
  - [ ] Node functions for all 8 nodes (6 agents + CEO review + approval gate)
  - [ ] Conditional edge functions
  - [ ] LangGraph StateGraph assembly
  - [ ] AsyncSqliteSaver checkpointing
- [ ] **Services**
  - [ ] `WorkflowService` (start, pause, resume, cancel)
  - [ ] `ApprovalService` (create, resolve with 3 decisions)
  - [ ] `DocumentService` (store, list, get by type)
  - [ ] `ProjectService` (CRUD + status updates)
- [ ] **WebSocket**
  - [ ] Connection manager with broadcast
  - [ ] Events emitted from node functions
- [ ] **API**
  - [ ] Project CRUD endpoints
  - [ ] Workflow control endpoints
  - [ ] Agent status + output endpoints
  - [ ] Document endpoints
  - [ ] Approval endpoints
  - [ ] Settings + health endpoints
  - [ ] WebSocket endpoint
- [ ] **Integration test**: Full workflow end-to-end with MockProvider

### Phase 4: Frontend Implementation
- [ ] **Dashboard**
  - [ ] Project cards with status
  - [ ] Agent activity feed (WebSocket)
  - [ ] Pending approvals widget
  - [ ] "Launch Demo" card
- [ ] **New Project**
  - [ ] Creation form
  - [ ] Workflow start
- [ ] **Project Workspace**
  - [ ] Document tabs viewer
  - [ ] Approval panel (3 decisions)
- [ ] **Workflow Visualizer**
  - [ ] Graph with nodes + edges
  - [ ] Status coloring
  - [ ] Step detail panel
- [ ] **Agent Command Center**
  - [ ] Agent cards
  - [ ] Execution log table
- [ ] **Settings**
  - [ ] Provider display + health
- [ ] **Polish**
  - [ ] WebSocket integration across all pages
  - [ ] Loading states
  - [ ] Error states

### Phase 5: Evaluation + Demo + Testing
- [ ] **Evaluation**
  - [ ] Scoring functions per agent type
  - [ ] Evaluation engine
  - [ ] Default evaluation dataset
  - [ ] API endpoint
- [ ] **Demo**
  - [ ] Pre-authored demo idea text
  - [ ] `POST /api/demo/start` endpoint
  - [ ] Frontend demo launch flow
- [ ] **Testing**
  - [ ] Provider unit tests
  - [ ] Agent unit tests (schema validation)
  - [ ] Workflow integration test
  - [ ] API integration tests
  - [ ] Approval flow test (all 3 decisions)
  - [ ] Evaluation test (MockProvider ≥ 0.7)
  - [ ] Offline mode test

### Phase 6: Documentation
- [ ] README.md
- [ ] .env.example documentation
- [ ] Setup instructions
- [ ] Demo walkthrough

---

**End of architecture document v2. Awaiting final approval before Phase 2 implementation begins.**
