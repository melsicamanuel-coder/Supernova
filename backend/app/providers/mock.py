import asyncio
import json
import random
import re
from pathlib import Path
from typing import Type, TypeVar

from pydantic import BaseModel

from app.config import settings
from app.providers.base import HealthStatus, ModelInfo, ModelProvider

T = TypeVar("T", bound=BaseModel)

MOCK_DATA_DIR = Path(__file__).parent / "mock_data"

AGENT_TYPE_MAP: dict[str, str] = {
    "ExecutiveSummary": "ceo",
    "ResearchReport": "research",
    "PRD": "cpo",
    "TechArchitecture": "cto",
    "TaskBreakdown": "engineering",
    "TestPlan": "qa",
}


class MockProvider(ModelProvider):

    def __init__(self, **kwargs) -> None:
        self._latency_min = settings.mock_latency_min_ms
        self._latency_max = settings.mock_latency_max_ms

    async def _simulate_latency(self) -> None:
        delay_ms = random.randint(self._latency_min, self._latency_max)
        await asyncio.sleep(delay_ms / 1000.0)

    def _interpolate(self, text: str, prompt: str) -> str:
        project_name = "Unnamed Project"
        idea_text = prompt[:200] if prompt else ""

        name_match = re.search(r"project[:\s]+[\"']?([^\"'\n]+)", prompt, re.IGNORECASE)
        if name_match:
            project_name = name_match.group(1).strip()

        text = text.replace("{{project_name}}", project_name)
        text = text.replace("{{idea_text}}", idea_text)
        return text

    def _load_responses(self, agent_type: str) -> list[dict]:
        path = MOCK_DATA_DIR / f"{agent_type}_responses.json"
        if not path.exists():
            raise FileNotFoundError(f"Mock data not found: {path}")
        with open(path) as f:
            data = json.load(f)
        return data["responses"]

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        await self._simulate_latency()
        return f"Mock response for prompt: {prompt[:100]}..."

    async def generate_structured(
        self, prompt: str, schema: Type[T], system_prompt: str = ""
    ) -> T:
        await self._simulate_latency()

        schema_name = schema.__name__
        agent_type = AGENT_TYPE_MAP.get(schema_name)
        if not agent_type:
            raise ValueError(f"No mock data for schema: {schema_name}")

        responses = self._load_responses(agent_type)
        template = random.choice(responses)
        raw_json = json.dumps(template)
        interpolated = self._interpolate(raw_json, prompt)
        data = json.loads(interpolated)
        return schema.model_validate(data)

    async def get_model_info(self) -> ModelInfo:
        return ModelInfo(
            provider="mock",
            model_name="mock-structured",
            supports_structured_output=True,
            context_window=None,
        )

    async def health_check(self) -> HealthStatus:
        return HealthStatus(healthy=True, latency_ms=0)
