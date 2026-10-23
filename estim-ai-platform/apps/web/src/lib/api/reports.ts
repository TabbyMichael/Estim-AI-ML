'use client'

/**
 * Reporting: /reports, /reports/generate, /reports/schedules.
 * Schedules list lives at `/reports/schedules/list` (the bare
 * `/reports/schedules` is POST-only).
 */

import { http, type PageParams, type Paginated } from './client'

export type ReportFormat = 'json' | 'markdown' | 'csv'
export type ReportStatus = 'pending' | 'generated' | 'failed' | string

export type Report = {
  id: string
  report_type: string
  title: string
  status: ReportStatus
  format: ReportFormat
  content: string
  generated_by: string
  created_at: string
  error?: string | null
}

export type ReportSchedule = {
  id: string
  report_type: string
  interval: 'daily' | 'weekly'
  enabled: boolean
  created_by: string
  created_at: string
  next_run_at?: string | null
}

export type ReportList = Paginated<Report, 'reports'>

export const reportsApi = {
  list: (params: PageParams & { report_type?: string }) =>
    http.get<ReportList>('/reports', { params }),

  generate: (payload: {
    report_type: string
    format?: ReportFormat
    filters?: Record<string, unknown>
    generated_by?: string
  }) => http.post<Report>('/reports/generate', payload),

  get: (reportId: string) => http.get<Report>(`/reports/${reportId}`),

  listSchedules: () => http.get<ReportSchedule[]>('/reports/schedules/list'),

  createSchedule: (payload: {
    report_type: string
    interval?: 'daily' | 'weekly'
    created_by?: string
  }) => http.post<ReportSchedule>('/reports/schedules', payload),

  tickSchedules: () => http.post<ReportList>('/reports/schedules/tick'),
}
