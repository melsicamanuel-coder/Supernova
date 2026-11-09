import json
from typing import Type

from pydantic import BaseModel

from app.agents.base import AgentInput, BaseAgent
from app.agents.schemas import ExecutiveSummary


class CEOAgent(BaseAgent):

    @property
    def agent_type(self) -> str:
        return "ceo"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return ExecutiveSummary

    @property
    def system_prompt(self) -> str:
        return (
            "You are a Chief Executive Officer with deep expertise in evaluating "
            "technology ventures. Your role is to assess a product idea from a "
            "strategic business perspective.\n\n"
            "Evaluate the following dimensions:\n"
            "1. MARKET VIABILITY — Is there a real market for this? Who are the "
            "customers and how large is the addressable market?\n"
            "2. COMPETITIVE LANDSCAPE — What alternatives exist? What is the "
            "differentiation strategy?\n"
            "3. TECHNICAL FEASIBILITY — Can this be built with reasonable effort "
            "and existing technology?\n"
            "4. BUSINESS MODEL — How will this generate revenue or value?\n"
            "5. RISKS — What are the top risks (technical, market, regulatory, "
            "execution) and how can they be mitigated?\n\n"
            "Provide your verdict as one of: 'proceed' (viable, worth building), "
            "'pivot' (interesting but needs significant changes), or 'reject' "
            "(not viable).\n\n"
            "Your confidence score should be between 0.0 and 1.0.\n"
            "Your feasibility_score should be between 0.0 and 1.0.\n\n"
            "Output must be valid JSON matching the ExecutiveSummary schema with "
            "fields: verdict, confidence, summary, strengths, risks (each with "
            "severity/description/mitigation), recommendations, "
            "market_assessment, feasibility_score."
        )

    def build_prompt(self, agent_input: AgentInput) -> str:
        parts = [
            f"Project: {agent_input.project_name}",
            f"Idea: {agent_input.idea_text}",
        ]
        return "\n\n".join(parts)


class CEOReviewAgent(BaseAgent):
    """CEO agent for final review after all other agents have produced output."""

    @property
    def agent_type(self) -> str:
        return "ceo_review"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return ExecutiveSummary

    @property
    def system_prompt(self) -> str:
        return (
            "You are the Chief Executive Officer conducting a FINAL REVIEW of a "
            "product that has been fully analyzed by your team. All specialist "
            "reports are available below.\n\n"
            "Review the complete body of work:\n"
            "1. Does the research support the initial assessment?\n"
            "2. Is the PRD comprehensive and aligned with market needs?\n"
            "3. Is the technical architecture sound and achievable?\n"
            "4. Is the engineering plan realistic with proper dependencies?\n"
            "5. Does the test plan cover critical paths adequately?\n\n"
            "Provide your FINAL verdict: 'proceed' (ready to build), 'pivot' "
            "(needs changes before building), or 'reject' (stop here).\n\n"
            "Incorporate insights from all team reports into your assessment. "
            "Your confidence and feasibility scores should reflect the full "
            "picture, not just the initial idea.\n\n"
            "Output must be valid JSON matching the ExecutiveSummary schema."
        )

    def build_prompt(self, agent_input: AgentInput) -> str:
        state = agent_input.shared_state
        parts = [
            f"Project: {agent_input.project_name}",
            f"Idea: {agent_input.idea_text}",
        ]
        if state.get("ceo_initial_evaluation"):
            parts.append(f"Initial CEO Evaluation:\n{json.dumps(state['ceo_initial_evaluation'], indent=2)}")
        if state.get("research_report"):
            parts.append(f"Research Report:\n{json.dumps(state['research_report'], indent=2)}")
        if state.get("prd"):
            parts.append(f"Product Requirements:\n{json.dumps(state['prd'], indent=2)}")
        if state.get("tech_architecture"):
            parts.append(f"Technical Architecture:\n{json.dumps(state['tech_architecture'], indent=2)}")
        if state.get("task_breakdown"):
            parts.append(f"Engineering Plan:\n{json.dumps(state['task_breakdown'], indent=2)}")
        if state.get("test_plan"):
            parts.append(f"Test Plan:\n{json.dumps(state['test_plan'], indent=2)}")
        return "\n\n---\n\n".join(parts)
