from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.session import get_db
from app.main import app
from app.models import Base

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(autouse=True)
async def _isolate_graph():
    """Prevent background graph execution and reset the checkpointer between tests."""
    import app.orchestrator.graph as graph_mod

    graph_mod._checkpointer = None
    with patch("app.api.workflow.launch_workflow_background"), \
         patch("app.api.demo.launch_workflow_background"):
        yield
    if graph_mod._checkpointer is not None:
        try:
            await graph_mod._checkpointer.conn.close()
        except Exception:
            pass
        graph_mod._checkpointer = None


@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def client(db_session):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
