'use client'

/**
 * Audit: /audit/logs|summary|record|purge.
 * `purge` takes `retention_days` as a query parameter (not a body).
 */

import { http, type PageParams, type Paginated } from './client'

export type AuditLog = {
  id: string
  actor: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, unknown>
  ip_address: string
  correlation_id: string
  created_at: string
}

export type AuditSummary = {
  total: number
  sampled: number
  total_logged: number
  by_action: Record<string, number>
  by_resource: Record<string, number>
}

export type AuditLogList = Paginated<AuditLog, 'logs'>

export const auditApi = {
  listLogs: (params: PageParams & {
    actor?: string
    action?: string
    resource_type?: string
  }) => http.get<AuditLogList>('/audit/logs', { params }),

  summary: () => http.get<AuditSummary>('/audit/summary'),

  record: (payload: {
    actor: string
    action: string
    resource_type?: string
    resource_id?: string
    details?: Record<string, unknown>
  }) => http.post<AuditLog>('/audit/record', payload),

  purge: (retentionDays?: number) =>
    http.post<{ purged: number }>('/audit/purge', undefined, {
      params: retentionDays ? { retention_days: retentionDays } : undefined,
    }),
}
