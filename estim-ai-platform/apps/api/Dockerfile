FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System dependencies for psycopg2, healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (better layer caching)
COPY apps/api/setup.py apps/api/pyproject.toml ./
RUN pip install --upgrade pip && pip install -e ".[dev]"

# Copy application code
COPY apps/api/app ./app
COPY apps/api/migrations ./migrations
COPY apps/api/tests ./tests
COPY apps/api/alembic.ini ./alembic.ini

# Entrypoint script: run Alembic migrations then start the API
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/docs || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
