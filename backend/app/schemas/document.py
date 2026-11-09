from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    project_id: str
    doc_type: str
    title: str
    content: dict
    version: int
    agent_type: str
    workflow_step_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
