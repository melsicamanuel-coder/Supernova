from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    provider: str = "mock"
    default_model: str = "mock-structured"
    mock_latency_min_ms: int = 800
    mock_latency_max_ms: int = 2000
    ollama_url: str = "http://localhost:11434"
    fallback_to_mock: bool = True
    max_retries: int = 2
    request_timeout_s: int = 120
    database_url: str = "sqlite+aiosqlite:///./supernova.db"
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_prefix": "SUPERNOVA_"}


settings = Settings()
