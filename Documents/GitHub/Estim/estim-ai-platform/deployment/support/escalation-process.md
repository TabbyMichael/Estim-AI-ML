# Estim AI Platform - Escalation Process

## Level 1: Support Team
- Handles access, how-to, P3/P4 bugs, and intake.
- Escalate if unresolved after 1 business day.
- Escalate immediately on suspected data loss or security issues.

## Level 2: Platform On-Call
- Handles P2 and confirmed technical incidents.
- Owns service recovery, database checks, and deployment rollback.
- Updates `#estim-incidents` every 30–60 minutes.

## Level 3: Engineering and Data Owners
- Handles unresolved P2, all P1, model/data defects, and migrations.
- Approves production data fixes and model rollbacks.

## Level 4: Platform Lead and Security
- Handles major customer impact, regulatory, or security incidents.
- Declares disaster recovery and authorizes region failover.

## Escalation Checklist
- Severity and customer impact.
- What changed recently.
- Relevant logs, dashboards, request IDs, and monitor reports.
- Current mitigation and next owner.
