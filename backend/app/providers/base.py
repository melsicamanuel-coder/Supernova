from abc import ABC, abstractmethod
from typing import Optional, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class ModelInfo(BaseModel):
    provider: str
    model_name: str
    supports_structured_output: bool
    context_window: Optional[int] = None


class HealthStatus(BaseModel):
    healthy: bool
    latency_ms: Optional[int] = None
    error: Optional[str] = None


class ModelProvider(ABC):

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        ...

    @abstractmethod
    async def generate_structured(
        self, prompt: str, schema: Type[T], system_prompt: str = ""
    ) -> T:
        ...

    @abstractmethod
    async def get_model_info(self) -> ModelInfo:
        ...

    @abstractmethod
    async def health_check(self) -> HealthStatus:
        ...
