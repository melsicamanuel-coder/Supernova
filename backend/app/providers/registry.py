from typing import Type

from app.providers.base import ModelProvider


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, Type[ModelProvider]] = {}

    def register(self, name: str, cls: Type[ModelProvider]) -> None:
        self._providers[name] = cls

    def get(self, name: str, **kwargs) -> ModelProvider:
        if name not in self._providers:
            available = ", ".join(self._providers.keys()) or "(none)"
            raise ValueError(
                f"Unknown provider '{name}'. Available: {available}"
            )
        return self._providers[name](**kwargs)

    def list_available(self) -> list[str]:
        return list(self._providers.keys())


registry = ProviderRegistry()


def _register_defaults() -> None:
    from app.providers.mock import MockProvider
    registry.register("mock", MockProvider)


_register_defaults()
