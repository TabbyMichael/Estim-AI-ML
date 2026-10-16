'use client'

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
    <main style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Audit Log
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Phase 6.3 — Immutable audit trail of mutating platform activity.
      </p>

      <section style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
          Summary
        </div>
        <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', minWidth: 260 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total logged</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary?.total_logged ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sampled</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary?.sampled ?? '—'}</span>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '0.8rem', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total distinct</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary?.total ?? '—'}</span>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <input value={actor} onChange={(e) => setActor(e.target.value)}
          placeholder="Filter by actor" style={inputStyle} />
        <input value={action} onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action" style={inputStyle} />
        <input value={resourceType} onChange={(e) => setResourceType(e.target.value)}
          placeholder="Filter by resource type" style={inputStyle} />
      </section>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}>Audit logs</h2>
      {isLoading ? <p>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Time</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Actor</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Action</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Resource</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>ID</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Details</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs ?? []).map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem', fontSize: '0.9rem', fontFamily: 'monospace' }}>{l.created_at}</td>
                <td style={{ padding: '0.5rem' }}>{l.actor}</td>
                <td style={{ padding: '0.5rem' }}>{l.action}</td>
                <td style={{ padding: '0.5rem' }}>{l.resource_type}</td>
                <td style={{ padding: '0.5rem' }}>{l.resource_id}</td>
                <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>{JSON.stringify(l.details ?? {})}</td>
                <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.logs.length === 0 && <p style={{ color: '#64748b' }}>No audit logs yet.</p>}

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '2rem 0 0.5rem' }}>Actions</h2>
      <section style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => record.mutate()} disabled={record.isPending}
          style={buttonStyle('#6366f1')}>
          {record.isPending ? 'Recording…' : 'Record sample log'}
        </button>
        <button onClick={() => purge.mutate()} disabled={purge.isPending}
          style={buttonStyle('#ef4444')}>
          {purge.isPending ? 'Purging…' : 'Purge expired (retention=0)'}
        </button>
      </section>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', color: '#0f172a', fontSize: '0.95rem',
}

const buttonStyle = (bg: string): React.CSSProperties => ({
  padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: bg,
  color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  opacity: 0.9,
})
