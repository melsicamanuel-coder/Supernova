from fastapi import APIRouter

from app.api.agents import router as agents_router
from app.api.approvals import router as approvals_router
from app.api.demo import router as demo_router
from app.api.documents import router as documents_router
from app.api.projects import router as projects_router
from app.api.settings_api import router as settings_router
from app.api.workflow import router as workflow_router

api_router = APIRouter(prefix="/api")
api_router.include_router(projects_router)
api_router.include_router(workflow_router)
api_router.include_router(agents_router)
api_router.include_router(documents_router)
api_router.include_router(approvals_router)
api_router.include_router(settings_router)
api_router.include_router(demo_router)
