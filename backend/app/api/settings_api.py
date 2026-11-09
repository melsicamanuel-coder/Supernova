from fastapi import APIRouter

from app.config import settings
from app.providers.registry import registry
from app.schemas.settings import ProviderHealthResponse, SettingsResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings():
    return SettingsResponse(
        active_provider=settings.provider,
        default_model=settings.default_model,
        available_providers=registry.list_available(),
        max_retries=settings.max_retries,
        request_timeout_s=settings.request_timeout_s,
        fallback_to_mock=settings.fallback_to_mock,
    )


@router.get("/health", response_model=ProviderHealthResponse)
async def check_health():
    provider = registry.get(settings.provider)
    status = await provider.health_check()
    return ProviderHealthResponse(provider=settings.provider, status=status)
