/** Reporting fixtures. */

import type { Report, ReportList, ReportSchedule } from '../api/reports'
import { daysAgo, hoursAgo } from './seed'

export const DEMO_REPORTS: Report[] = [
  {
    id: 'rep-401',
    report_type: 'executive_summary',
    title: 'Executive summary — week 38',
    status: 'generated',
    format: 'markdown',
    content:
      '# Executive summary — week 38\n\nPortfolio spend is tracking 2.1% under forecast. Two projects carry elevated risk: Meridian Hospital Wing (schedule) and Northgate Logistics Hub (steel escalation). Procurement anomalies are down 18% week over week.\n\n## Highlights\n- 6 active projects, 3 on track\n- 14 open alerts, 3 critical\n- Forecast accuracy 94.2%',
    generated_by: 'usr-admin',
    created_at: hoursAgo(3),
    error: null,
  },
  {
    id: 'rep-402',
    report_type: 'cost_variance',
    title: 'Cost variance — September',
    status: 'generated',
    format: 'csv',
    content: 'project,predicted,actual,variance\nprj-1001,151800000,92400000,-1200000\n',
    generated_by: 'usr-admin',
    created_at: daysAgo(1),
    error: null,
  },
  {
    id: 'rep-403',
    report_type: 'procurement_anomalies',
    title: 'Procurement anomalies — week 38',
    status: 'generated',
    format: 'json',
    content: '{"open":4,"high":2,"medium":2,"reviewed":3}',
    generated_by: 'usr-admin',
    created_at: daysAgo(2),
    error: null,
  },
  {
    id: 'rep-404',
    report_type: 'maintenance_health',
    title: 'Equipment health — fleet summary',
    status: 'generated',
    format: 'markdown',
    content: '# Equipment health\n\n5 of 12 assets need maintenance. Chiller CH-02 and Welding Rig WR-09 are critical.',
    generated_by: 'usr-admin',
    created_at: daysAgo(3),
    error: null,
  },
  {
    id: 'rep-405',
    report_type: 'inspection_summary',
    title: 'Inspection quality report — Q3',
    status: 'generated',
    format: 'markdown',
    content: '# Inspection quality\n\n21 defects detected across 9 inspections. 3 inspections require rework.',
    generated_by: 'usr-admin',
    created_at: daysAgo(6),
    error: null,
  },
  {
    id: 'rep-406',
    report_type: 'executive_summary',
    title: 'Executive summary — week 37',
    status: 'failed',
    format: 'markdown',
    content: '',
    generated_by: 'usr-admin',
    created_at: daysAgo(8),
    error: 'Template rendering timed out after 30s.',
  },
  {
    id: 'rep-407',
    report_type: 'cost_variance',
    title: 'Cost variance — August',
    status: 'generated',
    format: 'markdown',
    content: '# Cost variance — August\n\nPortfolio variance +1.4% against baseline.',
    generated_by: 'usr-admin',
    created_at: daysAgo(32),
    error: null,
  },
]

export const DEMO_REPORT_LIST: ReportList = {
  reports: DEMO_REPORTS,
  total: DEMO_REPORTS.length,
  skip: 0,
  limit: 50,
}

export const DEMO_REPORT_SCHEDULES: ReportSchedule[] = [
  {
    id: 'sch-1',
    report_type: 'executive_summary',
    interval: 'weekly',
    enabled: true,
    created_by: 'usr-admin',
    created_at: daysAgo(90),
    next_run_at: daysAgo(-3),
  },
  {
    id: 'sch-2',
    report_type: 'cost_variance',
    interval: 'daily',
    enabled: true,
    created_by: 'usr-admin',
    created_at: daysAgo(60),
    next_run_at: daysAgo(-1),
  },
  {
    id: 'sch-3',
    report_type: 'procurement_anomalies',
    interval: 'weekly',
    enabled: false,
    created_by: 'usr-admin',
    created_at: daysAgo(45),
    next_run_at: null,
  },
]

export const DEMO_REPORT_TYPES = [
  'executive_summary',
  'cost_variance',
  'procurement_anomalies',
  'maintenance_health',
  'inspection_summary',
]

/** Report generation volume, last 8 weeks. */
export const DEMO_REPORT_TREND = [
  { week: 'W31', generated: 6, failed: 1 },
  { week: 'W32', generated: 8, failed: 0 },
  { week: 'W33', generated: 7, failed: 1 },
  { week: 'W34', generated: 9, failed: 0 },
  { week: 'W35', generated: 11, failed: 2 },
  { week: 'W36', generated: 10, failed: 0 },
  { week: 'W37', generated: 12, failed: 1 },
  { week: 'W38', generated: 9, failed: 0 },
]
