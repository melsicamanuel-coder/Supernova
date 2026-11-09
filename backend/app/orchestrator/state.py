from typing import Any, Optional, TypedDict


class SharedProjectState(TypedDict, total=False):
    project_id: str
    project_name: str
    idea_text: str
    workflow_run_id: str
    current_node: str
    workflow_status: str

    ceo_initial_evaluation: Optional[dict[str, Any]]
    research_report: Optional[dict[str, Any]]
    prd: Optional[dict[str, Any]]
    tech_architecture: Optional[dict[str, Any]]
    task_breakdown: Optional[dict[str, Any]]
    test_plan: Optional[dict[str, Any]]
    ceo_final_review: Optional[dict[str, Any]]

    approval_status: Optional[str]
    approval_decision: Optional[str]
    approval_notes: Optional[str]

    error: Optional[str]
