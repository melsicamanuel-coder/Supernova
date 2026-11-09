from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(max_length=200)
    description: str = Field(default="", max_length=2000)
    idea_text: str = Field(max_length=10000)
    config: Optional[dict] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    config: Optional[dict] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    idea_text: str
    status: str
    config: Optional[dict]
    is_demo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
