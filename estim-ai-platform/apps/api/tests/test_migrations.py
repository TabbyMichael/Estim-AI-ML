"""Tests for Alembic migration chain (Phase 1.7 gate)."""

from pathlib import Path


class TestMigrations:
    def test_env_py_exists(self):
        env_path = Path(__file__).parent.parent / "migrations" / "env.py"
        assert env_path.exists()

    def test_alembic_ini_exists(self):
        ini_path = Path(__file__).parent.parent / "alembic.ini"
        assert ini_path.exists()

    def test_single_head(self):
        """Only one head revision may exist at Phase 1."""
        versions_dir = Path(__file__).parent.parent / "migrations" / "versions"
        heads = [
            p
            for p in versions_dir.glob("*.py")
            if p.name != "__init__.py" and "down_revision = None" in p.read_text()
        ]
        assert len(heads) == 1, f"Expected single head, found: {[p.name for p in heads]}"

    def test_initial_migration_creates_all_schemas(self):
        content = (
            Path(__file__).parent.parent / "migrations" / "versions" / "001_initial_schemas.py"
        ).read_text()
        for schema in [
            "identity",
            "procurement",
            "cost_forecasting",
            "inventory",
            "maintenance",
            "project_risk",
            "visual_inspection",
            "document_intelligence",
            "platform",
            "integrations",
        ]:
            assert schema in content
        assert "vector" in content
