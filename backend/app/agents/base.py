import time
from abc import ABC, abstractmethod
from typing import Any, Literal, Optional, Type

from pydantic import BaseModel

from app.providers.base import ModelProvider


class AgentInput(BaseModel):
    project_id: str
    idea_text: str
    project_name: str = "Unnamed Project"
    shared_state: dict[str, Any] = {}
    retry_count: int = 0


class AgentOutput(BaseModel):
    agent_type: str
    status: Literal["success", "failure"]
    output: dict[str, Any]
    duration_ms: int
    provider_used: str
    model_used: str
    token_usage: Optional[dict] = None
    error: Optional[str] = None


class BaseAgent(ABC):

    def __init__(self, provider: ModelProvider) -> None:
        self.provider = provider

    @property
    @abstractmethod
    def agent_type(self) -> str: ...

    @property
    @abstractmethod
    def system_prompt(self) -> str: ...

    @property
    @abstractmethod
    def output_schema(self) -> Type[BaseModel]: ...

    @abstractmethod
    def build_prompt(self, agent_input: AgentInput) -> str: ...

    async def execute(self, agent_input: AgentInput) -> AgentOutput:
        start = time.perf_counter()
        try:
            prompt = self.build_prompt(agent_input)
            model_info = await self.provider.get_model_info()

            result = await self.provider.generate_structured(
                prompt=prompt,
                schema=self.output_schema,
                system_prompt=self.system_prompt,
            )

            elapsed_ms = int((time.perf_counter() - start) * 1000)

            return AgentOutput(
                agent_type=self.agent_type,
                status="success",
                output=result.model_dump(),
                duration_ms=elapsed_ms,
                provider_used=model_info.provider,
                model_used=model_info.model_name,
            )
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            model_info = None
            try:
                model_info = await self.provider.get_model_info()
            except Exception:
                pass

            return AgentOutput(
                agent_type=self.agent_type,
                status="failure",
                output={},
                duration_ms=elapsed_ms,
                provider_used=model_info.provider if model_info else "unknown",
                model_used=model_info.model_name if model_info else "unknown",
                error=str(exc),
            )
