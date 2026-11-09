import json
from typing import Type

from pydantic import BaseModel

from app.agents.base import AgentInput, BaseAgent
from app.agents.schemas import PRD


class CPOAgent(BaseAgent):

    @property
    def agent_type(self) -> str:
        return "cpo"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return PRD

    @property
    def system_prompt(self) -> str:
        return (
            "You are a Chief Product Officer with extensive experience creating "
            "Product Requirements Documents for technology products. Your role "
            "is to transform executive direction and research findings into a "
            "comprehensive PRD.\n\n"
            "Your PRD must include:\n"
            "1. PRODUCT VISION — Clear, compelling one-paragraph vision.\n"
            "2. TARGET USERS — Detailed personas with roles, pain points, and "
            "goals.\n"
            "3. PROBLEM STATEMENTS — Specific problems being solved.\n"
            "4. FUNCTIONAL REQUIREMENTS — Prioritized using MoSCoW (must, "
            "should, could, wont). Each with a unique ID like FR-001.\n"
            "5. NON-FUNCTIONAL REQUIREMENTS — Performance, security, "
            "scalability. Each with ID like NFR-001.\n"
            "6. USER STORIES — In 'As a X, I want Y, so that Z' format with "
            "acceptance criteria. Each with ID like US-001.\n"
            "7. FEATURE PRIORITIES — Features ranked by business value.\n"
            "8. SUCCESS METRICS — Measurable KPIs.\n"
            "9. OUT OF SCOPE — Explicitly excluded items.\n\n"
            "Ground your decisions in the research findings and CEO direction. "
            "Be specific enough that an engineering team can build from this.\n\n"
            "Output must be valid JSON matching the PRD schema with fields: "
            "product_name, vision, target_users, problem_statements, "
            "functional_requirements, non_functional_requirements, user_stories, "
            "feature_priorities, success_metrics, out_of_scope."
        )

    def build_prompt(self, agent_input: AgentInput) -> str:
        state = agent_input.shared_state
        parts = [
            f"Project: {agent_input.project_name}",
            f"Idea: {agent_input.idea_text}",
        ]
        if state.get("ceo_initial_evaluation"):
            parts.append(f"CEO Evaluation:\n{json.dumps(state['ceo_initial_evaluation'], indent=2)}")
        if state.get("research_report"):
            parts.append(f"Research Report:\n{json.dumps(state['research_report'], indent=2)}")
        return "\n\n".join(parts)
