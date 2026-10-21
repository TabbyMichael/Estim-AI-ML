/** Audit fixtures: log stream + aggregate summary. */

import type { AuditLog, AuditLogList, AuditSummary } from '../api/audit'
import { daysAgo, hoursAgo } from './seed'

type Seed = {
  actor: string
  action: string
  resourceType: string
  resourceId: string
  details: Record<string, unknown>
  created: string
}

const SEEDS: Seed[] = [
  { actor: 'usr-admin', action: 'procurement.anomaly.review', resourceType: 'anomaly', resourceId: 'anom-504', details: { decision: 'approve', notes: 'Short delivery accepted with credit note.' }, created: hoursAgo(1) },
  { actor: 'usr-admin', action: 'report.generate', resourceType: 'report', resourceId: 'rep-401', details: { report_type: 'executive_summary', format: 'markdown' }, created: hoursAgo(3) },
  { actor: 'usr-admin', action: 'inspection.create', resourceType: 'inspection', resourceId: 'insp-1', details: { project_id: 'prj-1001', title: 'Level 12 slab pour — pre-cover check' }, created: hoursAgo(6) },
  { actor: 'usr-pm', action: 'cost_forecast.approve', resourceType: 'cost_forecast', resourceId: 'fc-3001', details: { predicted_amount: 151_800_000, model_version: 'v2.4.1' }, created: hoursAgo(9) },
  { actor: 'usr-pm', action: 'purchase_order.create', resourceType: 'purchase_order', resourceId: 'po-8810', details: { po_number: 'PO-2026-0427', total_amount: 672_000 }, created: hoursAgo(12) },
  { actor: 'usr-proc', action: 'procurement.anomaly.review', resourceType: 'anomaly', resourceId: 'anom-503', details: { decision: 'investigate' }, created: daysAgo(1) },
  { actor: 'usr-admin', action: 'user.role.assign', resourceType: 'user', resourceId: 'usr-maint', details: { role: 'maintenance_manager' }, created: daysAgo(1) },
  { actor: 'usr-admin', action: 'notification.preference.update', resourceType: 'preference', resourceId: 'usr-admin', details: { channel: 'sms', event_type: 'project_risk', enabled: true }, created: daysAgo(2) },
  { actor: 'usr-maint', action: 'maintenance.prediction.record', resourceType: 'equipment', resourceId: 'eq-8', details: { failure_probability: 0.91, horizon_days: 30 }, created: daysAgo(2) },
  { actor: 'usr-pm', action: 'milestone.update', resourceType: 'milestone', resourceId: 'prj-1004-ms-4', details: { status: 'in_progress', progress_pct: 35 }, created: daysAgo(3) },
  { actor: 'usr-admin', action: 'document.upload', resourceType: 'document', resourceId: 'doc-203', details: { filename: 'Northgate_Steel_Erection_Method.pdf', size_bytes: 4_812_004 }, created: daysAgo(3) },
  { actor: 'usr-admin', action: 'audit.purge', resourceType: 'audit', resourceId: '*', details: { retention_days: 365, purged: 1284 }, created: daysAgo(6) },
  { actor: 'usr-proc', action: 'purchase_order.approve', resourceType: 'purchase_order', resourceId: 'po-8801', details: { po_number: 'PO-2026-0418', total_amount: 270_780 }, created: daysAgo(4) },
  { actor: 'usr-admin', action: 'inventory.snapshot.create', resourceType: 'stock_snapshot', resourceId: 'stock-6', details: { material_id: 'MAT-GYPSUM-15', quantity_on_hand: 620 }, created: daysAgo(5) },
  { actor: 'usr-admin', action: 'auth.login', resourceType: 'user', resourceId: 'usr-admin', details: { ip: '203.0.113.42' }, created: daysAgo(7) },
]

export const DEMO_AUDIT_LOGS: AuditLog[] = SEEDS.map((seed, index) => ({
  id: `audit-${1000 + index}`,
  actor: seed.actor,
  action: seed.action,
  resource_type: seed.resourceType,
  resource_id: seed.resourceId,
  details: seed.details,
  ip_address: '203.0.113.42',
  correlation_id: `corr-${(9_820_000 + index * 137).toString(16)}`,
  created_at: seed.created,
}))

export const DEMO_AUDIT_LIST: AuditLogList = {
  logs: DEMO_AUDIT_LOGS,
  total: DEMO_AUDIT_LOGS.length,
  skip: 0,
  limit: 100,
}

export const DEMO_AUDIT_SUMMARY: AuditSummary = {
  total: DEMO_AUDIT_LOGS.length,
  sampled: DEMO_AUDIT_LOGS.length,
  total_logged: 8_642,
  by_action: SEEDS.reduce<Record<string, number>>((acc, seed) => {
    acc[seed.action] = (acc[seed.action] ?? 0) + 1
    return acc
  }, {}),
  by_resource: SEEDS.reduce<Record<string, number>>((acc, seed) => {
    acc[seed.resourceType] = (acc[seed.resourceType] ?? 0) + 1
    return acc
  }, {}),
}
