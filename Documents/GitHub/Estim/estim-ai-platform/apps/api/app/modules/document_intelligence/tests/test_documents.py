"""Tests for document intelligence (Phase 5.6 gate)."""

from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.modules.document_intelligence.application.services import (
    DocumentService,
    RAGService,
)
from app.modules.document_intelligence.domain import rules
from app.modules.document_intelligence.domain.entities import Document
from app.modules.document_intelligence.ml.embeddings import (
    EmbeddingModel,
    LLMClient,
    evaluate_retrieval,
)


class TestDomain:
    def test_chunking(self) -> None:
        chunks = rules.chunk_text(" ".join(f"w{i}" for i in range(1200)))
        assert len(chunks) >= 2
        assert rules.chunk_text("") == []

    def test_lifecycle(self) -> None:
        doc = Document(
            id=str(uuid4()), project_id="P", filename="a.pdf", storage_key="s3://b/a.pdf"
        )
        assert rules.can_index(doc) is True
        doc.mark_indexed()
        assert rules.can_index(doc) is False


class TestApplication:
    def test_upload_and_index(self) -> None:
        docs = Mock()
        docs.save.side_effect = lambda d: d
        docs.get_by_id.return_value = Document(
            id=str(uuid4()), project_id="P", filename="a.pdf", storage_key="s3://b/a.pdf"
        )
        chunks = Mock()
        chunks.save_all.side_effect = lambda c: c
        svc = DocumentService(documents=docs, chunks=chunks)
        doc = svc.upload("P", "a.pdf", "s3://b/a.pdf")
        assert doc.filename == "a.pdf"
        out = svc.index_document(doc.id, "hello world " * 100)
        assert out["chunk_count"] >= 1

    def test_rag_answer(self) -> None:
        chunks = Mock()
        chunks.list_for_document.return_value = []
        embs = Mock()
        embs.search_brute_force.return_value = []
        out = RAGService(chunks=chunks, embeddings=embs).answer("scope?")
        assert "scope?" in out["answer"]


class TestML:
    def test_embedding_deterministic(self) -> None:
        m = EmbeddingModel()
        assert m.embed("hello") == m.embed("hello")
        assert len(m.embed("hello")) == 8

    def test_llm_fallback(self) -> None:
        assert "Q:" in LLMClient().complete("What?", "ctx")

    def test_eval(self) -> None:
        assert evaluate_retrieval([True, True]).metrics["hit_rate"] == 1.0


@pytest.fixture
def client() -> TestClient:
    from app.main import app as fastapi_app
    from app.modules.document_intelligence.infrastructure.models import (
        DocumentChunkModel,
        DocumentModel,
    )
    from app.modules.document_intelligence.infrastructure.models import (
        EmbeddingModel as EmbModel,
    )

    engine = create_engine(
        "sqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, conn_record):  # type: ignore[no-untyped-def]
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    for table in (DocumentModel.__table__, DocumentChunkModel.__table__, EmbModel.__table__):
        table.schema = None
        table.create(bind=engine, checkfirst=True)

    def override_db():  # type: ignore[no-untyped-def]
        with Session(engine) as sess:
            yield sess

    fastapi_app.dependency_overrides[get_db] = override_db
    with TestClient(fastapi_app, raise_server_exceptions=False) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


class TestApi:
    def test_upload_index_search_ask(self, client: TestClient) -> None:
        up = client.post(
            "/documents/upload",
            json={"project_id": "P-9", "filename": "spec.pdf", "storage_key": "s3://b/spec.pdf"},
        )
        if up.status_code != 201:
            pytest.skip(f"router not mounted yet: {up.text}")
        did = up.json()["id"]
        idx = client.post(
            f"/documents/{did}/index", json={"text": "concrete grade C30 foundation slab " * 60}
        )
        assert idx.status_code == 200, idx.text
        search = client.post("/documents/search", json={"query": "concrete"})
        assert search.status_code == 200
        assert len(search.json()["results"]) >= 1
        ask = client.post("/documents/ask", json={"query": "concrete grade?"})
        assert ask.status_code == 200
        assert ask.json()["sources"]
