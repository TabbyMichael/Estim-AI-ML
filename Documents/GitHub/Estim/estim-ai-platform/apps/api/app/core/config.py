"""Application configuration and environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    app_name: str = "Estim AI Platform"
    debug: bool = False
    environment: str = "development"

    # Database
    database_url: str = "postgresql://estim:estim@localhost:5432/estim_ai"
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600

    # Security
    secret_key: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30
    jwt_refresh_expire_days: int = 7

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Odoo Integration
    odoo_url: str = ""
    odoo_db: str = ""
    odoo_username: str = ""
    odoo_password: str = ""
    odoo_sync_interval_minutes: int = 15

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "estim-ai"

    # Object Storage
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "estim-ai-artifacts"
    s3_region: str = "us-east-1"

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    celery_task_timeout: int = 300

    # Monitoring
    prometheus_enabled: bool = True
    metrics_port: int = 9090

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    log_correlation_id_enabled: bool = True

    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True

    # Feature Flags
    enable_procurement_ai: bool = True
    enable_cost_forecasting: bool = False
    enable_inventory_ai: bool = False
    enable_maintenance_ai: bool = False
    enable_project_risk_ai: bool = False
    enable_visual_inspection: bool = False
    enable_document_intelligence: bool = False

    # Model Configuration
    procurement_anomaly_model_version: str = "v1"
    procurement_anomaly_threshold: float = 0.7
    cost_forecast_model_version: str = "v1"
    inventory_forecast_model_version: str = "v1"

    # Data Retention
    audit_log_retention_days: int = 365
    event_outbox_retention_days: int = 30
    model_artifact_retention_days: int = 90


settings = Settings()
