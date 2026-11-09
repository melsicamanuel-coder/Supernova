from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class ApprovalResponse(BaseModel):
    id: str
    project_id: str
    workflow_run_id: str
    step_name: str
    status: str
    decision: Optional[str]
    reviewer_notes: Optional[str]
    output_snapshot: Optional[dict]
    requested_at: datetime
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprovalResolve(BaseModel):
    decision: Literal["approved", "rejected", "revision_requested"]
    notes: Optional[str] = None
