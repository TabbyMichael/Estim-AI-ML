#!/bin/sh
set -e

# Wait briefly for PostgreSQL to accept connections (depends_on healthcheck
# should already cover this, but a small retry loop makes startup robust).
for i in $(seq 1 30); do
  if python -c "import sqlalchemy; create_engine=sqlalchemy.create_engine; e=create_engine('${DATABASE_URL}'.replace('postgresql://', 'postgresql+psycopg2://')); e.connect().close()" 2>/dev/null; then
    echo "PostgreSQL is ready."
    break
  fi
  echo "PostgreSQL is unavailable - sleeping (attempt $i/30)"
  sleep 2
done

# Run Alembic migrations to create/update all tables (including platform schema
# for reports, report_schedules, audit_logs, notifications, etc.)
echo "Running Alembic migrations..."
alembic upgrade head

# Start the FastAPI application
echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000