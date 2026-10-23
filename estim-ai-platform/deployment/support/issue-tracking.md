# Estim AI Platform - Issue Tracking Process

## Intake
- Every request needs: reporter, environment, steps, expected result, actual result, severity guess.
- Log user issues as GitHub issues and add module labels.
- Attach correlation/request IDs from API logs or UI errors.

## Labels
- `severity/p1`, `severity/p2`, `severity/p3`, `severity/p4`
- `module/procurement`, `module/forecasting`, `module/inventory`, `module/maintenance`
- `module/project-risk`, `module/visual-inspection`, `module/document-intelligence`
- `type/bug`, `type/data`, `type/access`, `type/question`, `type/feature`

## Triage SLA
- New issues triaged within one business day.
- Reproduce and confirm severity before assignment.
- P1/P2 issues link to the incident thread and on-call runbook.

## Closure Criteria
- Fix verified in staging.
- Regression test or monitor check added where practical.
- Requester confirms the original symptom is resolved.
