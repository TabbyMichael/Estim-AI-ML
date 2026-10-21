/** Dashboard-specific fixtures and derivations. */

import type { AuditLog, AuditLogList } from '../api/audit'
import { DEMO_AUDIT_LOGS } from './audit'
import { DEMO_PROJECTS } from './projects'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type DemoAlert = {
  id: string
  title: string
  detail: string
  severity: AlertSeverity
  module: string
  href: string
  created_at: string
}

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: 'alert-1',
    title: 'Meridian Hospital Wing is 11 days behind',
    detail: 'Ward fit-out slipped again; delay probability now 84%.',
    severity: 'critical',
    module: 'Project risk',
    href: '/project-risk',
    created_at: DEMO_AUDIT_LOGS[0].created_at,
  },
  {
    id: 'alert-2',
    title: 'AHU pricing anomaly on PO-2026-0420',
    detail: 'Quoted unit price is 21.9% above the peer median.',
    severity: 'critical',
    module: 'Procurement',
    href: '/procurement',
    created_at: DEMO_AUDIT_LOGS[1].created_at,
  },
  {
    id: 'alert-3',
    title: 'Welding Rig WR-09 is offline',
    detail: 'Failure probability 91% within 30 days — schedule service.',
    severity: 'critical',
    module: 'Maintenance',
    href: '/maintenance',
    created_at: DEMO_AUDIT_LOGS[2].created_at,
  },
  {
    id: 'alert-4',
    title: 'Gypsum stock cover below 10 days',
    detail: 'Meridian site will run out at current demand in 7.4 days.',
    severity: 'warning',
    module: 'Inventory',
    href: '/inventory',
    created_at: DEMO_AUDIT_LOGS[3].created_at,
  },
  {
    id: 'alert-5',
    title: 'Northgate forecast upper bound +14.8%',
    detail: 'Steel escalation pushes the confidence ceiling to $71.8M.',
    severity: 'warning',
    module: 'Cost forecasting',
    href: '/cost-forecasting',
    created_at: DEMO_AUDIT_LOGS[4].created_at,
  },
  {
    id: 'alert-6',
    title: 'Rework flagged on Level 12 slab',
    detail: 'Inspection detected exposed rebar in 1 of 4 findings.',
    severity: 'warning',
    module: 'Visual inspection',
    href: '/visual-inspection',
    created_at: DEMO_AUDIT_LOGS[5].created_at,
  },
  {
    id: 'alert-7',
    title: 'Weekly executive summary generated',
    detail: 'Week 38 report is ready to download.',
    severity: 'info',
    module: 'Reports',
    href: '/reports',
    created_at: DEMO_AUDIT_LOGS[6].created_at,
  },
]

export type ActivityItem = {
  id: string
  actor: string
  action: string
  resource: string
  created_at: string
}

export const DEMO_ACTIVITY: ActivityItem[] = DEMO_AUDIT_LOGS.slice(0, 7).map((log: AuditLog) => ({
  id: log.id,
  actor: log.actor,
  action: log.action,
  resource: log.resource_type,
  created_at: log.created_at,
}))

/** Most recent audit entries, shaped like the paginated API response. */
export const DEMO_ACTIVITY_LIST: AuditLogList = {
  logs: DEMO_AUDIT_LOGS.slice(0, 8),
  total: DEMO_AUDIT_LOGS.length,
  skip: 0,
  limit: 8,
}

/** Sparkline fixtures for the four portfolio KPIs. */
export const KPI_SPARKLINES = {
  activeProjects: [4, 4, 5, 5, 5, 6, 6],
  onTrack: [38, 40, 45, 47, 45, 50, 50],
  atRisk: [3, 3, 2, 3, 4, 3, 3],
  alerts: [4, 6, 5, 6, 7, 6, 7],
}

/** Portfolio KPI rollup (also used to seed trend chips). */
export function portfolioKpis() {
  const active = DEMO_PROJECTS.length
  const onTrack = DEMO_PROJECTS.filter((project) => project.status === 'on_track').length
  const atRisk = DEMO_PROJECTS.filter((project) => project.status === 'at_risk').length
  const delayed = DEMO_PROJECTS.filter((project) => project.status === 'delayed').length
  const budget = DEMO_PROJECTS.reduce((sum, project) => sum + project.budget, 0)
  const spent = DEMO_PROJECTS.reduce((sum, project) => sum + project.spent, 0)
  return {
    active,
    onTrack,
    onTrackPct: Math.round((onTrack / active) * 100),
    atRisk,
    delayed,
    budget,
    spent,
    remaining: budget - spent,
    utilisation: spent / budget,
    openAlerts: DEMO_ALERTS.length,
  }
}
