import pytest

from app.providers.base import ModelProvider
from app.providers.mock import MockProvider
from app.providers.registry import registry


@pytest.mark.asyncio
async def test_mock_provider_is_model_provider():
    provider = MockProvider()
    assert isinstance(provider, ModelProvider)


@pytest.mark.asyncio
async def test_mock_provider_health():
    provider = MockProvider()
    status = await provider.health_check()
    assert status.healthy is True


@pytest.mark.asyncio
async def test_mock_provider_model_info():
    provider = MockProvider()
    info = await provider.get_model_info()
    assert info.provider == "mock"
    assert info.supports_structured_output is True


@pytest.mark.asyncio
async def test_mock_provider_generate():
    provider = MockProvider()
    result = await provider.generate("test prompt")
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_registry_lists_mock():
    assert "mock" in registry.list_available()


@pytest.mark.asyncio
async def test_registry_get_mock():
    provider = registry.get("mock")
    assert isinstance(provider, MockProvider)


@pytest.mark.asyncio
async def test_registry_unknown_provider():
    with pytest.raises(ValueError, match="Unknown provider"):
        registry.get("nonexistent")
