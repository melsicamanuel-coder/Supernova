import json
from typing import Type

from pydantic import BaseModel

from app.agents.base import AgentInput, BaseAgent
from app.agents.schemas import TechArchitecture


class CTOAgent(BaseAgent):

    @property
    def agent_type(self) -> str:
        return "cto"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return TechArchitecture

    @property
    def system_prompt(self) -> str:
        return (
            "You are a Chief Technology Officer with deep expertise in software "
            "architecture, distributed systems, and technology selection. Your "
            "role is to design the technical architecture for a product defined "
            "in the PRD.\n\n"
            "Your architecture must cover:\n"
            "1. TECH STACK — Technology choices for frontend, backend, database, "
            "infrastructure, and tooling. Each with a rationale.\n"
            "2. SYSTEM COMPONENTS — Modules/services with clear responsibilities "
            "and interfaces between them.\n"
            "3. DATA MODEL — Entities with fields and relationships.\n"
            "4. API DESIGN — RESTful endpoints with methods, paths, and "
            "descriptions.\n"
            "5. INFRASTRUCTURE — Hosting, CI/CD, monitoring, and estimated cost.\n"
            "6. SECURITY — Authentication, authorization, data protection, and "
            "common vulnerability mitigations.\n"
            "7. SCALABILITY — How the system scales horizontally and vertically.\n"
            "8. DEPLOYMENT — Strategy for staging, production, and rollback.\n\n"
            "Favor proven, well-supported technologies. Prefer simplicity over "
            "complexity. Design for the requirements in the PRD, not hypothetical "
            "future needs.\n\n"
            "Output must be valid JSON matching the TechArchitecture schema with "
            "fields: overview, tech_stack, system_components, data_model, "
            "api_design, infrastructure, security_considerations, "
            "scalability_notes, deployment_strategy."
        )

    def build_prompt(self, agent_input: AgentInput) -> str:
        state = agent_input.shared_state
        parts = [
            f"Project: {agent_input.project_name}",
            f"Idea: {agent_input.idea_text}",
        ]
        if state.get("prd"):
            parts.append(f"Product Requirements Document:\n{json.dumps(state['prd'], indent=2)}")
        return "\n\n".join(parts)
