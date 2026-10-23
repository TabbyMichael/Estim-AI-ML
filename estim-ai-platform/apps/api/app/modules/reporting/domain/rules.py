"""Rules for the reporting module: rendering + schedule math."""

import csv
import io
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.modules.reporting.domain.entities import ReportFormat

REPORT_TITLES: dict[str, str] = {
    "cost_forecast_summary": "Cost Forecast Summary",
    "inventory_stock": "Inventory Stock Report",
    "maintenance_health": "Equipment Health Report",
    "project_risk_overview": "Project Risk Overview",
    "audit_overview": "Audit Activity Overview",
}


def title_for(report_type: str) -> str:
    return REPORT_TITLES.get(report_type, report_type.replace("_", " ").title())


def render(payload: dict[str, Any], fmt: ReportFormat, title: str = "Report") -> str:
    """Render a payload dict into the requested format."""
    if fmt == ReportFormat.JSON:
        return json.dumps(payload, indent=2, default=str)
    if fmt == ReportFormat.CSV:
        rows = payload.get("rows", [])
        buf = io.StringIO()
        if rows:
            headers = list(rows[0].keys())
            writer = csv.DictWriter(buf, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
        return buf.getvalue()
    # MARKDOWN: title + key/value list + optional rows table
    lines = [f"# {title}", ""]
    for key, value in payload.items():
        if key == "rows":
            continue
        lines.append(f"- **{key}**: {value}")
    rows = payload.get("rows", [])
    if rows:
        lines.append("")
        headers = list(rows[0].keys())
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("| " + " | ".join("---" for _ in headers) + " |")
        for row in rows:
            lines.append("| " + " | ".join(str(row.get(h, "")) for h in headers) + " |")
    return "\n".join(lines)


def next_run(interval: str, from_time: datetime | None = None) -> datetime:
    base = from_time or datetime.now(UTC)
    delta = timedelta(days=7 if interval == "weekly" else 1)
    return base + delta


def is_due(last_run: datetime | None, interval: str, now: datetime | None = None) -> bool:
    ref = now or datetime.now(UTC)
    if last_run is None:
        return True
    return (ref - last_run) >= timedelta(days=7 if interval == "weekly" else 1)
