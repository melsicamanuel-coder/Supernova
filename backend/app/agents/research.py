import json
from typing import Type

from pydantic import BaseModel

from app.agents.base import AgentInput, BaseAgent
from app.agents.schemas import ResearchReport


class ResearchAgent(BaseAgent):

    @property
    def agent_type(self) -> str:
        return "research"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return ResearchReport

    @property
    def system_prompt(self) -> str:
        return (
            "You are a Senior Research Analyst specializing in technology markets "
            "and competitive intelligence. Your role is to conduct thorough "
            "research on a product idea that has already received an initial "
            "executive evaluation.\n\n"
            "Your research must cover:\n"
            "1. MARKET ANALYSIS — Market size, growth trends, customer segments, "
            "and demand signals.\n"
            "2. COMPETITOR LANDSCAPE — Direct and indirect competitors, their "
            "strengths, weaknesses, pricing, and market share.\n"
            "3. TECHNOLOGY TRENDS — Relevant technology trends that could impact "
            "the product.\n"
            "4. RISK ASSESSMENT — Technical, market, and regulatory risks with "
            "their likelihood and impact.\n"
            "5. DATA GAPS — What information is missing or uncertain.\n\n"
            "Be specific with findings. Each finding must have a title, "
            "description, source, and confidence level.\n"
            "Assumptions must include a validation method.\n\n"
            "Output must be valid JSON matching the ResearchReport schema with "
            "fields: executive_summary, findings, verified_facts, assumptions, "
            "market_context, competitor_landscape, key_risks, data_gaps."
        )

    def build_prompt(self, agent_input: AgentInput) -> str:
        state = agent_input.shared_state
        parts = [
            f"Project: {agent_input.project_name}",
            f"Idea: {agent_input.idea_text}",
        ]
        if state.get("ceo_initial_evaluation"):
            parts.append(f"CEO Initial Evaluation:\n{json.dumps(state['ceo_initial_evaluation'], indent=2)}")
        return "\n\n".join(parts)
