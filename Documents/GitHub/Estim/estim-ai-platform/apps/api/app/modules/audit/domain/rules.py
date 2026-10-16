"""Rules for the audit module: retention policy."""

from datetime import UTC, datetime, timedelta

from app.modules.audit.domain.entities import AuditLog

# HTTP method -> audit action
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def should_purge(created_at: datetime, retention_days: int,
                 now: datetime | None = None) -> bool:
    ref = now or datetime.now(UTC)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    return (ref - created_at) > timedelta(days=retention_days)


def purgeable(logs: list[AuditLog], retention_days: int,
              now: datetime | None = None) -> list[AuditLog]:
    return [log for log in logs if should_purge(log.created_at,
                                                retention_days, now)]


def summarize(logs: list[AuditLog]) -> dict:
    by_action: dict[str, int] = {}
    by_resource: dict[str, int] = {}
    for log in logs:
        by_action[log.action] = by_action.get(log.action, 0) + 1
        key = log.resource_type or "unknown"
        by_resource[key] = by_resource.get(key, 0) + 1
    return {"total": len(logs), "by_action": by_action,
            "by_resource": by_resource}
