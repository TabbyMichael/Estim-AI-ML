"""Tests for application configuration."""
import pytest

from app.core.config import settings


class TestSettings:
    """Test cases for Settings class."""

    def test_default_settings(self):
        """Test that default settings are loaded correctly."""
        assert settings.app_name == "Estim AI Platform"
        assert settings.debug is False
        assert settings.environment == "development"
        assert settings.jwt_algorithm == "HS256"
        assert settings.jwt_expire_minutes == 30

    def test_database_url_default(self):
        """Test default database URL."""
        assert settings.database_url == "postgresql://estim:estim@localhost:5432/estim_ai"

    def test_redis_url_default(self):
        """Test default Redis URL."""
        assert settings.redis_url == "redis://localhost:6379/0"

    def test_cors_origins_default(self):
        """Test default CORS origins."""
        assert "http://localhost:3000" in settings.cors_origins
        assert "http://localhost:3001" in settings.cors_origins

    def test_feature_flags_default(self):
        """Test default feature flags."""
        assert settings.enable_procurement_ai is True
        assert settings.enable_cost_forecasting is False
        assert settings.enable_inventory_ai is False

    def test_settings_from_env(self):
        """Test that settings can be loaded from environment variables."""
        from app.core.config import Settings

        test_settings = Settings(
            app_name="Test App",
            debug=True,
            database_url="postgresql://test:test@localhost:5432/test"
        )

        assert test_settings.app_name == "Test App"
        assert test_settings.debug is True
        assert test_settings.database_url == "postgresql://test:test@localhost:5432/test"

    def test_secret_key_warning(self):
        """Test that default secret key is a warning value."""
        assert settings.secret_key == "change_me_in_production"

    def test_model_configuration(self):
        """Test model configuration settings."""
        assert settings.procurement_anomaly_model_version == "v1"
        assert settings.procurement_anomaly_threshold == 0.7

    def test_data_retention_settings(self):
        """Test data retention settings."""
        assert settings.audit_log_retention_days == 365
        assert settings.event_outbox_retention_days == 30
        assert settings.model_artifact_retention_days == 90
