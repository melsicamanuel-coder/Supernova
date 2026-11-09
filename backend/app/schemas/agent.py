from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AgentInfo(BaseModel):
    type: str
    name: str
    description: str
    status: str
    current_project_id: Optional[str] = None
    total_executions: int = 0
    avg_duration_ms: Optional[int] = None
    last_executed_at: Optional[datetime] = None


class AgentListResponse(BaseModel):
    agents: list[AgentInfo]
