from setuptools import setup, find_packages

setup(
    name="estim-ai-platform",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.110.0",
        "uvicorn[standard]>=0.27.0",
        "pydantic>=2.6.0",
        "pydantic-settings>=2.1.0",
        "email-validator>=2.0.0",
        "sqlalchemy>=2.0.25",
        "alembic>=1.13.1",
        "psycopg2-binary>=2.9.9",
        "redis>=5.0.1",
        "celery>=5.3.6",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "python-dotenv>=1.0.1",
        "pytz>=2024.1",
        "pandas>=2.2.0",
        "numpy>=1.26.0",
    ],
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.3",
            "pytest-cov>=4.1.0",
            "httpx>=0.27.0",
            "black>=24.1.1",
            "ruff>=0.2.0",
            "mypy>=1.8.0",
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
