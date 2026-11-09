from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


async def store_document(
    db: AsyncSession,
    project_id: str,
    doc_type: str,
    title: str,
    content: dict,
    agent_type: str,
    workflow_step_id: str | None = None,
) -> Document:
    result = await db.execute(
        select(func.max(Document.version)).where(
            Document.project_id == project_id,
            Document.doc_type == doc_type,
        )
    )
    max_version = result.scalar() or 0

    doc = Document(
        project_id=project_id,
        doc_type=doc_type,
        title=title,
        content=content,
        version=max_version + 1,
        agent_type=agent_type,
        workflow_step_id=workflow_step_id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def get_documents(db: AsyncSession, project_id: str) -> list[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def get_document_by_type(db: AsyncSession, project_id: str, doc_type: str) -> Document | None:
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id, Document.doc_type == doc_type)
        .order_by(Document.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
