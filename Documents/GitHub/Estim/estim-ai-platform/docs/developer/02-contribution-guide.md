# Estim AI Platform - Contribution Guide

## 1. Welcome

Thank you for contributing to the Estim AI Platform! This guide covers the development workflow, coding standards, and pull request process.

## 2. Development Workflow

### 2.1 Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/description` | `feat/add-inventory-module` |
| Bug Fix | `fix/description` | `fix/login-token-expiration` |
| Documentation | `docs/description` | `docs/add-deployment-runbook` |
| Refactor | `refactor/description` | `refactor/cost-forecasting-query` |
| Hotfix | `hotfix/description` | `hotfix/critical-security-patch` |

### 2.2 Commit Messages

Use clear, descriptive commit messages:

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Examples:

```text
feat(inventory): add demand forecasting support

Adds ML-based demand forecasting to the inventory module.
Includes model training pipeline and REST API endpoints.

Co-authored-by: Cline <cline@local>
```

```text
fix(identity): correct token refresh logic

The refresh token was being invalidated after use.
Added proper token rotation to prevent reuse attacks.

Co-authored-by: Cline <cline@local>
```

### 2.3 Commit Types

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style changes (formatting) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Maintenance tasks |

## 3. Coding Standards

### 3.1 Python (FastAPI)

| Guideline | Example |
|-----------|---------|
| Type hints required | `def get_user(user_id: str) -> User:` |
| Docstrings for public functions | `"""Get user by ID."""` |
| Max line length: 100 | Follow PEP 8 |
| Use ruff for linting | `ruff check .` |
| Use black for formatting | `black .` |

### 3.2 TypeScript (Next.js)

| Guideline | Example |
|-----------|---------|
| Type interfaces | `interface User { id: string; }` |
| Use functional components | `export function Dashboard() {}` |
| Use functional components | `export function Dashboard() {}` |
| Max line length: 100 | Follow ESLint rules |
| Use ESLint | `npm run lint` |

### 3.3 Documentation

- Document public APIs (FastAPI, GraphQL)
- Write docstrings for Python functions
- Use JSDoc for TypeScript functions
- Keep READMEs up to date

### 3.4 Security

- Sanitize all user inputs
- Use parameterized queries (SQLAlchemy)
- Use JWT for authentication
- Never commit secrets or .env files
- Follow OWASP guidelines

## 4. Pull Request Process

### 4.1 Creating a PR

1. Fork the repository (if applicable)
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Push to your branch
6. Create a pull request

### 4.2 PR Template

```markdown
## Summary

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 4.3 PR Review

- Maintainer will review within 48 hours
- Address review comments
- Squash minor fixes into existing commits
- Keep PRs small and focused

## 5. Testing Requirements

| Change Type | Tests Required |
|-------------|----------------|
| New feature | Unit + integration tests |
| Bug fix | Test that reproduces the bug |
| Refactor | No new tests required |
| Documentation | No tests required |

### 5.1 Running Tests

```bash
# All tests
pytest

# Specific module
pytest apps/api/tests/test_module.py

# With coverage
pytest --cov=apps.api
```

## 6. Deployment

### 6.1 Staging

All PRs merge to `main` trigger staging deployment:

1. CI pipeline runs
2. Docker images built
3. E2E tests run
4. Deploy to staging

### 6.2 Production

Production deployments require:

1. Ticket filed
2. Staging validation
3. Production approval
4. Deploy with approval gate

## 7. Code Review Checklist

Before requesting review:

- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No secrets or debug code committed

## 8. Getting Help

- **Slack**: #estim-dev channel
- **Discord**: #estim-dev Discord server
- **GitHub Issues**: For bugs and feature requests

## 9. Related Documentation

- [Development Setup Guide](01-development-setup-guide.md)
- [Module Implementation Guide](00-module-implementation-guide.md)
- [Troubleshooting Guide](03-troubleshooting-guide.md)

---

*Last updated: 2026-10-19*
