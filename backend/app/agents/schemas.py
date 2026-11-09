from typing import Literal, Optional

from pydantic import BaseModel


# --- Shared sub-models ---

class Risk(BaseModel):
    severity: Literal["high", "medium", "low"]
    description: str
    mitigation: str


class Finding(BaseModel):
    title: str
    description: str
    source: str
    confidence: Literal["high", "medium", "low"]


class Assumption(BaseModel):
    statement: str
    risk_if_wrong: str
    validation_method: str


class UserPersona(BaseModel):
    name: str
    role: str
    pain_points: list[str]
    goals: list[str]


class Requirement(BaseModel):
    id: str
    title: str
    description: str
    priority: Literal["must", "should", "could", "wont"]


class UserStory(BaseModel):
    id: str
    as_a: str
    i_want: str
    so_that: str
    acceptance_criteria: list[str]


class FeaturePriority(BaseModel):
    feature: str
    priority: Literal["must", "should", "could"]
    rationale: str


class TechChoice(BaseModel):
    category: str
    choice: str
    rationale: str


class Component(BaseModel):
    name: str
    responsibility: str
    tech: str
    interfaces: list[str]


class Entity(BaseModel):
    entity: str
    fields: list[str]
    relationships: list[str]


class Endpoint(BaseModel):
    method: str
    path: str
    description: str


class InfrastructureSpec(BaseModel):
    hosting: str
    ci_cd: str
    monitoring: str
    estimated_cost: str


class Phase(BaseModel):
    name: str
    description: str
    duration_weeks: int


class EngineeringTask(BaseModel):
    id: str
    title: str
    description: str
    phase: str
    complexity: Literal["trivial", "simple", "moderate", "complex", "critical"]
    priority: Literal["low", "medium", "high", "critical"]
    estimated_hours: float
    dependencies: list[str]


class TestCategory(BaseModel):
    name: str
    description: str
    priority: Literal["high", "medium", "low"]


class TestScenario(BaseModel):
    id: str
    title: str
    category: str
    steps: list[str]
    expected_result: str
    priority: Literal["high", "medium", "low"]


# --- Agent output schemas ---

class ExecutiveSummary(BaseModel):
    verdict: Literal["proceed", "pivot", "reject"]
    confidence: float
    summary: str
    strengths: list[str]
    risks: list[Risk]
    recommendations: list[str]
    market_assessment: str
    feasibility_score: float


class ResearchReport(BaseModel):
    executive_summary: str
    findings: list[Finding]
    verified_facts: list[str]
    assumptions: list[Assumption]
    market_context: str
    competitor_landscape: str
    key_risks: list[str]
    data_gaps: list[str]


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


class TaskBreakdown(BaseModel):
    total_tasks: int
    estimated_hours: float
    phases: list[Phase]
    tasks: list[EngineeringTask]
    critical_path: list[str]
    risk_areas: list[str]


class TestPlan(BaseModel):
    strategy: str
    test_categories: list[TestCategory]
    test_scenarios: list[TestScenario]
    edge_cases: list[str]
    coverage_assessment: str
    risk_based_priorities: list[str]
    automation_recommendations: list[str]
