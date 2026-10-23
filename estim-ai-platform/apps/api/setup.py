from setuptools import find_packages, setup

setup(
    name="estim-ai-platform",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        # FastAPI is capped below 0.142: from 0.142.0 onwards FastAPI hard-requires
        # `opentelemetry-api>=1.44.0`, which is incompatible with the Jaeger Thrift
        # exporter (see the OpenTelemetry block below).
        "fastapi>=0.110.0,<0.142.0",
        "starlette>=0.46.0,<1.0.0",
        "uvicorn[standard]>=0.27.0",
        "pydantic>=2.6.0",
        "pydantic-settings>=2.1.0",
        "email-validator>=2.0.0",
        "python-multipart>=0.0.9",
        "sqlalchemy>=2.0.25",
        "alembic>=1.13.1",
        "psycopg2-binary>=2.9.9",
        "redis>=5.0.1",
        "celery>=5.3.6",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "bcrypt>=4.1.0",
        "python-dotenv>=1.0.1",
        "pytz>=2024.1",
        "pandas>=2.2.0",
        "numpy>=1.26.0",
        "boto3>=1.34.0",
        "prometheus-client>=0.20.0",
        # Distributed tracing (OpenTelemetry + Jaeger).
        #
        # These are exact pins, and the set is intentionally constrained:
        #   * `opentelemetry-exporter-jaeger` is deprecated and its final release
        #     (1.21.0) cannot satisfy `^1.28.0`. `opentelemetry-exporter-jaeger-thrift`
        #     is the supported replacement and provides `opentelemetry.exporter.jaeger.thrift`.
        #   * The Thrift exporter imports `OTEL_EXPORTER_JAEGER_AGENT_HOST` from the SDK;
        #     that symbol was removed in opentelemetry-sdk 1.40.0, so the SDK is capped
        #     at 1.39.x.
        #   * The SDK pins `opentelemetry-api` to an exact version, and the
        #     instrumentation package pins `opentelemetry-semantic-conventions`, which in
        #     turn pins the API version. 1.39.0 / 0.60b0 is the newest combination that
        #     keeps all four packages mutually consistent.
        #   * `Deprecated` is an *undeclared* runtime import of the Jaeger Thrift
        #     exporter (it is not listed in its metadata), so it must be required
        #     explicitly or importing the exporter raises ModuleNotFoundError.
        "opentelemetry-api==1.39.0",
        "opentelemetry-sdk==1.39.0",
        "opentelemetry-exporter-jaeger-thrift==1.21.0",
        "opentelemetry-instrumentation-fastapi==0.60b0",
        "Deprecated>=1.2.14",
        "thrift>=0.10.0",
    ],
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.3",
            "pytest-cov>=4.1.0",
            "httpx>=0.27.0,<0.29.0",
            "black>=24.1.1,<25.0.0",
            # ruff >= 0.4.0 is required: earlier releases do not know the
            # `UP042` selector that this project's ruff configuration references.
            "ruff>=0.4.0,<0.6.0",
            "mypy>=1.8.0,<2.0.0",
            # Type stubs
            "types-redis>=4.6.0",
            "types-python-jose>=3.3.0",
            "types-passlib>=1.7.0",
            "types-boto3>=1.34.0",
        ],
        "ml": [
            "scikit-learn>=1.4.0",
            "lightgbm>=4.3.0",
            "xgboost>=2.0.3",
            "torch>=2.2.0",
            "mlflow>=2.11.0",
        ],
    },
)
