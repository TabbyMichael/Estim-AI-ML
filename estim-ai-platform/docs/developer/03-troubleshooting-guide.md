# Estim AI Platform - Troubleshooting Guide

## 1. Common Issues

This guide helps developers troubleshoot common development, testing, and deployment issues.

## 2. Development Environment Issues

### 2.1 Python Virtual Environment

**Problem:** Python imports fail after installation.

**Solution:**
```bash
# Activate the virtual environment
source venv/bin/activate

# Verify installation
python -c "import fastapi; import sqlalchemy"
```

**If still failing:**
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -e .
```

### 2.2 Docker Compose Issues

**Problem:** `docker compose up` fails.

**Solution:**
```bash
# Check Docker is running
docker info

# Clean up old containers
docker compose down
docker system prune -f

# Try again
docker compose up -d
```

**Known Issues:**
- Port conflict: Change port mapping in docker-compose.yml
- Permission denied: Add user to docker group

### 2.3 Database Connection Issues

**Problem:** API cannot connect to PostgreSQL.

**Solution:**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U estim -d estim

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

## 3. Testing Issues

### 3.1 Tests Fail Locally

**Problem:** Tests pass in CI but fail locally.

**Solution:**
```bash
# Run with verbose output
pytest -v --tb=long

# Clean test database
docker compose down postgres
docker compose up -d postgres
alembic upgrade head

# Re-run tests
pytest
```

### 3.2 Architecture Tests Fail

**Problem:** Module boundary tests fail.

**Common Causes:**
1. Cross-schema query detected
2. Direct model access between modules
3. Missing repository interface

**Solution:**
1. Check error logs for the specific module
2. Refactor code to use repository pattern
3. Add proper interface contracts

### 3.3 Coverage Reports Missing

**Problem:** Coverage report not generated.

**Solution:**
```bash
# Install coverage tools
pip install coverage

# Run with coverage
pytest --cov=app --cov-report=html

# Open report
open htmlcov/index.html
```

## 4. Integration Issues

### 4.1 Odoo Sync Fails

**Problem:** Odoo synchronization failed.

**Solution:**
```bash
# Check Odoo connection
docker compose logs -f odoo

# Verify credentials in .env
echo $ODOO_URL
echo $ODOO_DB
```

**Common Issues:**
- Wrong Odoo URL format (must end with `/web`)
- Missing Odoo credentials
- Odoo database not accessible

### 4.2 MLflow Connection Fails

**Problem:** MLflow integration fails.

**Solution:**
```bash
# Check MLflow is running
docker compose ps mlflow

# Verify MLFLOW_TRACKING_URI
echo $MLFLOW_TRACKING_URI
```

**Expected format:**
```
http://localhost:5000
```

### 4.3 Redis Connection Issues

**Problem:** Workers cannot connect to Redis.

**Solution:**
```bash
# Check Redis is running
docker compose ps redis

# Test connection
docker compose exec redis redis-cli ping
```

**Expected response:** `PONG`

## 5. Performance Issues

### 5.1 Slow API Responses

**Symptoms:** API response times > 2 seconds.

**Troubleshooting:**
1. Check database query performance
2. Review Redis cache hit ratio
3. Check for N+1 queries

**Debug:**
```bash
# Enable SQL logging
export SQLALCHEMY_ECHO=1

# Check Redis cache
docker compose exec redis redis-cli INFO stats
```

### 5.2 Memory Issues

**Symptoms:** Out of memory errors during training.

**Solution:**
- Check worker memory limits
- Reduce batch size
- Enable Redis caching

## 6. Data Issues

### 6.1 Missing Data

**Problem:** Expected data is not present.

**Solution:**
1. Check if data was seeded
2. Verify sync completed successfully
3. Check event queue for failures

### 6.2 Data Inconsistency

**Problem:** Data appears inconsistent between modules.

**Solution:**
1. Check for failed events in the queue
2. Re-run failed sync jobs
3. Verify foreign key constraints

## 7. CI/CD Issues

### 7.1 CI Pipeline Fails

**Problem:** CI pipeline fails on pull request.

**Solution:**
1. Check CI logs for the specific failure
2. Run tests locally
3. Fix the issue
4. Push new commits

### 7.2 Staging Deployment Fails

**Problem:** Deploying to staging fails.

**Solution:**
1. Check staging logs
2. Verify production build
3. Check environment variables

## 8. Quick Reference

### 8.1 Useful Commands

```bash
# Check container logs
docker compose logs -f <service>

# View resource usage
docker compose stats

# Restart service
docker compose restart <service>

# Run specific test
pytest tests/unit/test_module.py::test_function

# Run linting
ruff check apps/api/

# Format code
black apps/api/
```

### 8.2 Diagnostic Commands

```bash
# Check database
docker compose exec postgres psql -U estim -d estim -c "SELECT * FROM users LIMIT 1"

# Check Redis
docker compose exec redis redis-cli KEYS '*'

# Check MLflow
curl http://localhost:5000/api/2.0/mlflow/mlruns

# Check Prometheus (metrics)
curl http://localhost:9090/api/v1/query?query=up
```

## 9. Emergency Contacts

| Role | Channel | Contact |
|------|---------|---------|
| Platform Lead | #estim-platform | Alex Kim |
| DevOps | #estim-devops | Sam Lee |
| Database Admin | #estim-database | Taylor Nguyen |
| Support | #estim-support | Support Team |

## 10. Related Documentation

- [Development Setup Guide](01-development-setup-guide.md)
- [Module Implementation Guide](00-module-implementation-guide.md)
- [Contribution Guide](02-contribution-guide.md)
