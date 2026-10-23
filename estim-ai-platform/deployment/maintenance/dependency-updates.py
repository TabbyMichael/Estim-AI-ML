#!/usr/bin/env python3
"""Report Python and Node dependency updates by semver risk."""

import json
import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("dependency-updates")


@dataclass
class DependencyUpdate:
    package: str
    current_version: str
    latest_version: str
    update_type: str
    risk_level: str

    @property
    def recommended(self) -> bool:
        return self.update_type in {"patch", "minor"}


def classify_update(current: str, latest: str) -> str:
    try:
        current_parts = [int(part) for part in current.split(".")[:3]]
        latest_parts = [int(part) for part in latest.split(".")[:3]]
        if latest_parts[0] > current_parts[0]:
            return "major"
        if latest_parts[1] > current_parts[1]:
            return "minor"
        if latest_parts[2] > current_parts[2]:
            return "patch"
    except (ValueError, IndexError):
        return "unknown"
    return "unknown"


def risk_level(update_type: str) -> str:
    return {"patch": "low", "minor": "medium", "major": "high"}.get(update_type, "unknown")

def check_python(project_dir: str):
    try:
        result = subprocess.run(
            ["pip", "list", "--outdated", "--format=json"],
            capture_output=True, text=True, cwd=project_dir, check=False,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return []
        rows = []
        for pkg in json.loads(result.stdout):
            current = str(pkg.get("version", "unknown"))
            latest = str(pkg.get("latest_version", "unknown"))
            kind = classify_update(current, latest)
            rows.append(DependencyUpdate(pkg.get("name", "unknown"), current, latest, kind, risk_level(kind)))
        return rows
    except Exception as exc:
        logger.warning("Python dependency check failed: %s", exc)
        return []


def check_node(project_dir: str):
    web_dir = os.path.join(project_dir, "apps", "web")
    if not os.path.isdir(web_dir):
        return []
    try:
        result = subprocess.run(
            ["npm", "outdated", "--json"], capture_output=True, text=True, cwd=web_dir, check=False,
        )
        if not result.stdout.strip():
            return []
        rows = []
        for name, info in json.loads(result.stdout).items():
            current = str(info.get("current", "unknown"))
            latest = str(info.get("latest", "unknown"))
            kind = classify_update(current, latest)
            rows.append(DependencyUpdate(name, current, latest, kind, risk_level(kind)))
        return rows
    except Exception as exc:
        logger.warning("Node dependency check failed: %s", exc)
        return []


def main() -> int:
    project_dir = os.getenv("PROJECT_DIR", ".")
    updates = check_python(project_dir) + check_node(project_dir)
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "updates": [
            {"package": u.package, "current": u.current_version, "latest": u.latest_version,
             "type": u.update_type, "risk": u.risk_level, "recommended": u.recommended}
            for u in updates
        ],
    }
    path = os.getenv("DEPENDENCY_REPORT_PATH", "/tmp/dependency-updates.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    for entry in report["updates"]:
        print(entry["risk"].upper(), entry["package"], entry["current"], "->", entry["latest"])
    print("report:", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
