'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type AuditLog = {
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

type AuditLogList = {
  logs: AuditLog[]
  total: number
  skip: number
  limit: number
}

type AuditSummary = {
  total: number
  sampled: number
  total_logged: number
  by_action: Record<string, number>
  by_resource: Record<string, number>
}

export default function AuditPage() {
  const qc = useQueryClient()
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')

  const { data, isLoading } = useQuery<AuditLogList>({
    queryKey: ['audit-logs', actor, action, resourceType],
    queryFn: async () => {
      const res = await axios.get(`${API}/audit/logs`, {
        params: {
          ...(actor ? { actor } : {}),
          ...(action ? { action } : {}),
          ...(resourceType ? { resource_type: resourceType } : {}),
        },
      })
      return res.data
    },
  })

  const { data: summary } = useQuery<AuditSummary>({
    queryKey: ['audit-summary'],
    queryFn: async () => (await axios.get(`${API}/audit/summary`)).data,
  })

  const record = useMutation({
    mutationFn: async () => (await axios.post(`${API}/audit/record`, {
      actor: 'web', action: 'http_post', resource_type: 'api',
      resource_id: '', details: { source: 'ui' },
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-logs'] })
      qc.invalidateQueries({ queryKey: ['audit-summary'] })
    },
  })

  const purge = useMutation({
    mutationFn: async () => (await axios.post(`${API}/audit/purge`, {
      params: { retention_days: 0 },
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-logs'] })
      qc.invalidateQueries({ queryKey: ['audit-summary'] })
    },
  })

  return (
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Audit Log
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Immutable audit trail of all platform activity
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="stat-value">{summary?.total_logged ?? '—'}</div>
          <div className="stat-label">Total Logged</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">{summary?.sampled ?? '—'}</div>
          <div className="stat-label">Sampled</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-value">{summary?.total ?? '—'}</div>
          <div className="stat-label">Distinct Events</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Filter Logs
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Filter by actor"
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action"
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <input
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            placeholder="Filter by resource type"
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Audit Logs
          </h3>
          <span className="badge badge-brand">{data?.total ?? 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading logs…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>ID</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {(data?.logs ?? []).map((l) => (
                  <tr key={l.id}>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{l.created_at}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{l.actor}</td>
                    <td>{l.action}</td>
                    <td>{l.resource_type}</td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{l.resource_id || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                      {JSON.stringify(l.details ?? {}).slice(0, 50)}
                      {JSON.stringify(l.details ?? {}).length > 50 ? '…' : ''}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{l.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.logs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit logs yet.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.25s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Administrative Actions
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => record.mutate()}
            disabled={record.isPending}
            className="btn btn-primary"
            style={{ minWidth: '160px' }}
          >
            {record.isPending ? 'Recording…' : 'Record Sample Log'}
          </button>
          <button
            onClick={() => purge.mutate()}
            disabled={purge.isPending}
            className="btn btn-ghost"
            style={{
              minWidth: '200px',
              borderColor: 'rgba(239,68,68,0.3)',
              color: '#ef4444',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            }}
          >
            {purge.isPending ? 'Purging…' : 'Purge Expired (retention=0)'}
          </button>
        </div>
      </div>
    </div>
  )
}
