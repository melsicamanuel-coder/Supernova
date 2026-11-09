# SUPERNOVA

**Autonomous Multi-Agent Intelligence & Engineering Platform**

SUPERNOVA is a local-first platform that orchestrates a team of AI agents to evaluate, research, plan, architect, and test startup ideas — end to end, with human approval gates.

Submit a project idea and watch six specialized agents collaborate through a structured pipeline: CEO evaluation, market research, product definition, technical architecture, engineering planning, and QA test planning. Every step produces a structured document you can review before approving the final output.

---

## Features

- **7-Step Agent Pipeline** — CEO Evaluate → Research → CPO (PRD) → CTO (Architecture) → Engineering (Task Breakdown) → QA (Test Plan) → CEO Review
- **Human-in-the-Loop** — Approve, reject, or request revision at the approval gate before anything is finalized
- **Real-Time Updates** — WebSocket-driven live progress as each agent completes its work
- **No API Keys Required** — Ships with a MockProvider that produces realistic structured outputs out of the box
- **Execution Tracing** — Every agent records status, duration, provider, model, and token usage (when available)
- **Resumable Workflows** — LangGraph checkpointing lets you pause and resume runs
- **Demo Mode** — One-click demo launches a preconfigured project through the full pipeline
- **Agent Command Center** — Interactive constellation view of all agents with status and execution history
- **Space-Themed UI** — Deep navy cosmic design with glass effects and smooth animations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Backend | Python 3.11+, FastAPI, SQLAlchemy (async), Pydantic v2 |
| Orchestration | LangGraph with SQLite checkpointing |
| Database | SQLite via aiosqlite |
| Real-time | WebSockets |
| AI Provider | MockProvider (built-in), Ollama (post-MVP) |

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **npm** or **pnpm**

### 1. Clone the repository

```bash
git clone https://github.com/melsicamanuel-coder/Supernova.git
cd Supernova
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Start the backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8888
```

The API will be available at `http://localhost:8888`. Interactive docs at `http://localhost:8888/docs`.

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Or create it manually with:
#   NEXT_PUBLIC_API_URL=http://localhost:8888/api
#   NEXT_PUBLIC_WS_URL=ws://localhost:8888/ws

# Start the dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Usage

### Create a New Project

1. Click **New Project** in the sidebar
2. Enter a project name and describe your startup idea
3. Click **Create Project**
4. Hit **Start Workflow** to kick off the agent pipeline

### Watch the Pipeline

Each agent runs in sequence, producing a structured document:

| Step | Agent | Output |
|------|-------|--------|
| 1 | CEO | Executive Summary — verdict, confidence, strengths, risks |
| 2 | Research | Research Report — findings, competitors, assumptions, data gaps |
| 3 | CPO | PRD — personas, requirements, user stories, feature priorities |
| 4 | CTO | Tech Architecture — stack, components, data model, API design |
| 5 | Engineering | Task Breakdown — phases, tasks, critical path, estimates |
| 6 | QA | Test Plan — scenarios, edge cases, coverage, automation recommendations |
| 7 | CEO | Final Review — consolidated assessment of all outputs |

### Approve or Revise

After all agents complete, the workflow pauses at the **Approval Gate**. You can:
- **Approve** — mark the project complete
- **Reject** — terminate the workflow
- **Request Revision** — loop back through all agents with your feedback

### Demo Mode

Click **Launch Demo** on the dashboard to run a preconfigured project through the full pipeline with no setup required.

---

## Project Structure

```
Supernova/
├── backend/
│   ├── app/
│   │   ├── agents/          # CEO, Research, CPO, CTO, Engineering, QA agents
│   │   ├── api/             # FastAPI route handlers
│   │   ├── db/              # Async SQLAlchemy session
│   │   ├── evaluation/      # Agent output scoring framework
│   │   ├── models/          # SQLAlchemy ORM models (5 tables)
│   │   ├── orchestrator/    # LangGraph state graph and nodes
│   │   ├── providers/       # ModelProvider ABC, MockProvider, registry
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic layer
│   │   └── websocket/       # Connection manager and event broadcast
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/             # Next.js pages (dashboard, projects, agents, etc.)
│       ├── components/      # UI components (shadcn + custom)
│       ├── hooks/           # React hooks (API, WebSocket, project state)
│       ├── lib/             # API client, WebSocket client, utilities
│       └── types/           # TypeScript type definitions
└── ARCHITECTURE.md          # Full system design document
```

---

## API Overview

The backend exposes 24 REST endpoints and 1 WebSocket endpoint:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| Projects | 5 | CRUD + listing with filters |
| Workflow | 5 | Start, pause, resume, cancel, status |
| Agents | 3 | Agent status and execution outputs |
| Documents | 2 | List and retrieve agent documents |
| Approvals | 3 | List, detail, resolve (approve/reject/revise) |
| Settings | 2 | Provider config and health check |
| Demo | 1 | One-click demo launch |
| WebSocket | 1 | Live workflow events per project |
| Health | 1 | Backend health check |

Full interactive API docs available at `/docs` when the backend is running.

---

## Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPERNOVA_PROVIDER` | `mock` | AI provider (`mock` or `ollama`) |
| `SUPERNOVA_DEFAULT_MODEL` | `mock-structured` | Model name |
| `SUPERNOVA_MOCK_LATENCY_MIN_MS` | `800` | Min simulated latency |
| `SUPERNOVA_MOCK_LATENCY_MAX_MS` | `2000` | Max simulated latency |
| `SUPERNOVA_FALLBACK_TO_MOCK` | `true` | Fall back to mock on provider failure |
| `SUPERNOVA_MAX_RETRIES` | `2` | Max retries per agent |
| `SUPERNOVA_DATABASE_URL` | `sqlite+aiosqlite:///./supernova.db` | Database connection |
| `SUPERNOVA_FRONTEND_URL` | `http://localhost:3000` | Frontend origin for CORS |

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design, including:

- Database schema (5 tables)
- Agent communication contracts and Pydantic schemas
- LangGraph workflow graph with conditional routing
- Human approval system (approve / reject / request revision)
- Observability and execution tracing
- Agent evaluation framework
- Provider abstraction (Mock → Ollama → cloud providers)
- Security considerations

---

## License

This project is provided as-is for educational and demonstration purposes.
