# mypy: ignore-errors
"""Document intelligence API routes: /documents/*."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import NotFoundError as CoreNotFound
from app.modules.document_intelligence.api.schemas import (
    AskRequest,
    AskResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadRequest,
    IndexRequest,
    SearchRequest,
    SourceHit,
)
from app.modules.document_intelligence.application.services import (
    DocumentService,
    RAGService,
)
from app.modules.document_intelligence.domain import entities as domain_errors
from app.modules.document_intelligence.infrastructure.repository import (
    SqlAlchemyChunkRepository,
    SqlAlchemyDocumentRepository,
    SqlAlchemyEmbeddingRepository,
)
from app.modules.document_intelligence.ml.embeddings import EmbeddingModel

router = APIRouter(prefix="/documents", tags=["documents"])


def _doc_service(db: Session = Depends(get_db)) -> DocumentService:
    return DocumentService(
        documents=SqlAlchemyDocumentRepository(db),
        chunks=SqlAlchemyChunkRepository(db),
        embeddings=SqlAlchemyEmbeddingRepository(db),
    )


def _rag_service(db: Session = Depends(get_db)) -> RAGService:
    embedder = EmbeddingModel()
    return RAGService(
        chunks=SqlAlchemyChunkRepository(db),
        embeddings=SqlAlchemyEmbeddingRepository(db),
        embed_fn=embedder.embed,
    )


@router.post("/upload", response_model=DocumentResponse,
             status_code=status.HTTP_201_CREATED)
def upload_document(
    body: DocumentUploadRequest, svc: DocumentService = Depends(_doc_service),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    doc = svc.upload(body.project_id, body.filename, body.storage_key,
                     body.content_type, body.created_by)
    db.commit()
    return DocumentResponse.from_entity(doc)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000),
    project_id: str | None = Query(None),
    svc: DocumentService = Depends(_doc_service),
) -> DocumentListResponse:
    filters = {"project_id": project_id} if project_id else {}
    docs, total = svc.list_documents(skip, limit, filters)
    return DocumentListResponse(
        documents=[DocumentResponse.from_entity(d) for d in docs],
        total=total, skip=skip, limit=limit)


@router.post("/{document_id}/index")
def index_document(
    document_id: str, body: IndexRequest,
    svc: DocumentService = Depends(_doc_service),
    db: Session = Depends(get_db),
) -> dict:
    try:
        out = svc.index_document(document_id, body.text,
                                 EmbeddingModel().embed)
    except domain_errors.NotFoundError as exc:
        raise CoreNotFound(str(exc)) from exc
    except ValueError as exc:
        from app.core.exceptions import BadRequestError
        raise BadRequestError(str(exc)) from exc
    db.commit()
    return out


@router.post("/search")
def search(
    body: SearchRequest, svc: RAGService = Depends(_rag_service),
) -> dict:
    return {"results": svc.search(body.query, body.limit)}


@router.post("/ask", response_model=AskResponse)
def ask(
    body: AskRequest, svc: RAGService = Depends(_rag_service),
) -> AskResponse:
    out = svc.answer(body.query, body.limit)
    return AskResponse(query=out["query"], answer=out["answer"],
                       sources=[SourceHit(**s) for s in out["sources"]])
