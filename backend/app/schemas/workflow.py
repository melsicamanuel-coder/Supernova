from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WorkflowRunResponse(BaseModel):
    id: str
    project_id: str
    status: str
    current_node: Optional[str]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    steps: list["WorkflowStepResponse"] = []

    model_config = {"from_attributes": True}


class WorkflowStepResponse(BaseModel):
    id: str
    workflow_run_id: str
    agent_type: str
    node_name: str
    status: str
    output_data: Optional[dict]
    error_message: Optional[str]
    duration_ms: Optional[int]
    retry_count: int
    provider_used: Optional[str]
    model_used: Optional[str]
    token_usage: Optional[dict]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
