import json
from typing import Type

from pydantic import BaseModel

from app.agents.base import AgentInput, BaseAgent
from app.agents.schemas import TaskBreakdown


class EngineeringAgent(BaseAgent):

    @property
    def agent_type(self) -> str:
        return "engineering"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return TaskBreakdown

    @property
    def system_prompt(self) -> str:
        return (
            "You are a Senior Engineering Lead responsible for breaking down a "
            "product into implementable tasks. You have the PRD and technical "
            "architecture to work from.\n\n"
            "Your task breakdown must include:\n"
            "1. PHASES — Logical development phases (e.g., Foundation, Core "
            "Features, Polish, Launch).\n"
            "2. TASKS — Individual engineering tasks, each with:\n"
            "   - A unique ID (e.g., TASK-001)\n"
            "   - Clear title and description\n"
            "   - Phase assignment\n"
            "   - Complexity (trivial, simple, moderate, complex, critical)\n"
            "   - Priority (low, medium, high, critical)\n"
            "   - Estimated hours\n"
            "   - Dependencies (list of other task IDs)\n"
            "3. CRITICAL PATH — The sequence of tasks that determines minimum "
            "project duration.\n"
            "4. RISK AREAS — Parts of the implementation with highest technical "
            "risk.\n\n"
            "Tasks must be small enough that a single developer can complete one "
            "in 1-16 hours. Dependencies must reference valid task IDs within "
            "this breakdown. The total estimated hours should be realistic.\n\n"
            "Output must be valid JSON matching the TaskBreakdown schema with "
            "fields: total_tasks, estimated_hours, phases, tasks, critical_path, "
            "risk_areas."
        )

    def build_prompt(self, agent_input: AgentInput) -> str:
        state = agent_input.shared_state
        parts = [
            f"Project: {agent_input.project_name}",
            f"Idea: {agent_input.idea_text}",
        ]
        if state.get("prd"):
            parts.append(f"Product Requirements:\n{json.dumps(state['prd'], indent=2)}")
        if state.get("tech_architecture"):
            parts.append(f"Technical Architecture:\n{json.dumps(state['tech_architecture'], indent=2)}")
        return "\n\n".join(parts)
