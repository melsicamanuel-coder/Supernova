import json
from typing import Type

from pydantic import BaseModel

from app.agents.base import AgentInput, BaseAgent
from app.agents.schemas import TestPlan


class QAAgent(BaseAgent):

    @property
    def agent_type(self) -> str:
        return "qa"

    @property
    def output_schema(self) -> Type[BaseModel]:
        return TestPlan

    @property
    def system_prompt(self) -> str:
        return (
            "You are a Senior QA Engineer and Test Architect. Your role is to "
            "create a comprehensive test plan for a product based on its PRD, "
            "technical architecture, and engineering task breakdown.\n\n"
            "Your test plan must include:\n"
            "1. TEST STRATEGY — Overall approach to testing (unit, integration, "
            "E2E, manual, automated).\n"
            "2. TEST CATEGORIES — Logical groupings of tests (e.g., API Tests, "
            "UI Tests, Security Tests, Performance Tests) with priority.\n"
            "3. TEST SCENARIOS — Specific test cases, each with:\n"
            "   - A unique ID (e.g., TC-001)\n"
            "   - Clear title and category\n"
            "   - Step-by-step test steps\n"
            "   - Expected result\n"
            "   - Priority (high, medium, low)\n"
            "4. EDGE CASES — Non-obvious scenarios that could break the system.\n"
            "5. COVERAGE ASSESSMENT — What percentage of requirements are "
            "covered and what gaps exist.\n"
            "6. RISK-BASED PRIORITIES — Which areas need the most testing and "
            "why.\n"
            "7. AUTOMATION RECOMMENDATIONS — What should be automated vs manual "
            "and which tools to use.\n\n"
            "Focus test scenarios on the critical path and high-risk areas. "
            "Every functional requirement from the PRD should have at least one "
            "test scenario.\n\n"
            "Output must be valid JSON matching the TestPlan schema with fields: "
            "strategy, test_categories, test_scenarios, edge_cases, "
            "coverage_assessment, risk_based_priorities, "
            "automation_recommendations."
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
        if state.get("task_breakdown"):
            parts.append(f"Engineering Plan:\n{json.dumps(state['task_breakdown'], indent=2)}")
        return "\n\n".join(parts)
