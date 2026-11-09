from typing import Optional

from pydantic import BaseModel

from app.providers.base import HealthStatus


class SettingsResponse(BaseModel):
    active_provider: str
    default_model: str
    available_providers: list[str]
    max_retries: int
    request_timeout_s: int
    fallback_to_mock: bool


class ProviderHealthResponse(BaseModel):
    provider: str
    status: HealthStatus
