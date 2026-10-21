"""Tests for environment configuration validation."""

from pathlib import Path

from app.core.config import settings


class TestEnvironmentConfiguration:
    """Test cases for environment configuration."""

    def test_env_example_exists(self):
        """Test that .env.example file exists."""
        # Navigate from tests/ to project root: tests/ -> api/ -> apps/ -> repo root
        # Path(__file__) is in apps/api/tests/
        env_example_path = Path(__file__).parent.parent.parent.parent / ".env.example"
        assert env_example_path.exists(), f".env.example should exist at {env_example_path}"

    def test_database_url_format(self):
        """Test that DATABASE_URL has correct format."""
        assert settings.database_url.startswith(
            "postgresql"
        ), "DATABASE_URL should start with postgresql"
        assert "estim_ai" in settings.database_url, "DATABASE_URL should contain database name"

    def test_redis_url_format(self):
        """Test that REDIS_URL has correct format."""
        assert settings.redis_url.startswith("redis"), "REDIS_URL should start with redis"

    def test_secret_key_format(self):
        """Test that SECRET_KEY is not empty."""
        assert len(settings.secret_key) > 0, "SECRET_KEY should not be empty"
        # In development, allow default value
        if settings.environment == "production":
            assert (
                settings.secret_key != "change_me_in_production"
            ), "SECRET_KEY should be changed in production"

    def test_cors_origins_configured(self):
        """Test that CORS origins are configured."""
        assert len(settings.cors_origins) > 0, "CORS origins should be configured"
        assert all(
            origin.startswith("http") for origin in settings.cors_origins
        ), "All CORS origins should start with http"

    def test_jwt_settings(self):
        """Test JWT configuration."""
        assert settings.jwt_algorithm in [
            "HS256",
            "RS256",
        ], "JWT algorithm should be HS256 or RS256"
        assert settings.jwt_expire_minutes > 0, "JWT expire minutes should be positive"

    def test_feature_flags_consistency(self):
        """Test that feature flags are boolean."""
        assert isinstance(settings.enable_procurement_ai, bool)
        assert isinstance(settings.enable_cost_forecasting, bool)
        assert isinstance(settings.enable_inventory_ai, bool)

    def test_model_configuration(self):
        """Test model configuration values."""
        assert (
            settings.procurement_anomaly_threshold >= 0
        ), "Anomaly threshold should be non-negative"
        assert settings.procurement_anomaly_threshold <= 1, "Anomaly threshold should be at most 1"

    def test_data_retention_settings(self):
        """Test data retention settings are positive."""
        assert settings.audit_log_retention_days > 0
        assert settings.event_outbox_retention_days > 0
        assert settings.model_artifact_retention_days > 0
