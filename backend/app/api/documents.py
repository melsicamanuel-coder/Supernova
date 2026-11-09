from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.document import Document
from app.schemas.document import DocumentResponse

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])


@router.get("", response_model=list[DocumentResponse])
async def list_documents(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{doc_type}", response_model=DocumentResponse)
async def get_document_by_type(
    project_id: str, doc_type: str, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id, Document.doc_type == doc_type)
        .order_by(Document.version.desc())
        .limit(1)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, f"No {doc_type} document found for this project")
    return doc
