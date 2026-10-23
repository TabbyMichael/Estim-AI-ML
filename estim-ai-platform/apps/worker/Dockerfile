FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Reuse API dependencies - worker shares the monolith codebase.
# Build context is the repo root (see docker-compose.yml), so paths
# are relative to the repository root.
COPY apps/api/setup.py apps/api/pyproject.toml ./
RUN pip install --upgrade pip && pip install -e ".[dev]"

# Copy full backend (modules + worker entrypoint)
COPY apps/api/app ./app
COPY apps/worker/celery_app.py ./celery_app.py
COPY apps/worker/task_registry.py ./task_registry.py

CMD ["celery", "-A", "celery_app.celery_app", "worker", "--loglevel=info"]
