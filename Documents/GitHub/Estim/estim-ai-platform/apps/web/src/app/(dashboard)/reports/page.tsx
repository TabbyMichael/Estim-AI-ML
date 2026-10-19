'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Report = {
  id: string
  report_type: string
  title: string
  status: string
  format: string
  generated_by: string
  created_at: string
  error: string | null
}

type ReportList = {
  reports: Report[]
  total: number
  skip: number
  limit: number
}

type Schedule = {
  id: string
  report_type: string
  interval: string
  enabled: boolean
  created_by: string
  created_at: string
  last_run_at: string | null
  next_run_at: string | null
}

export default function ReportsPage() {
  const qc = useQueryClient()
  const [reportType, setReportType] = useState('po_spend')
  const [format, setFormat] = useState('markdown')
  const [filterType, setFilterType] = useState('')

  const { data, isLoading } = useQuery<ReportList>({
    queryKey: ['reports', filterType],
    queryFn: async () => {
      const res = await axios.get(`${API}/reports`, {
        params: filterType ? { report_type: filterType } : undefined,
      })
      return res.data
    },
  })

  const generate = useMutation({
    mutationFn: async () => (await axios.post(`${API}/reports/generate`, {
      report_type: reportType, format, generated_by: 'web',
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })

  const { data: schedules } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => (await axios.get(`${API}/reports/schedules/list`)).data,
  })

  const createSchedule = useMutation({
    mutationFn: async () => (await axios.post(`${API}/reports/schedules`, {
      report_type: reportType, interval: 'daily', created_by: 'web',
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })

  const tick = useMutation({
    mutationFn: async () => (await axios.post(`${API}/reports/schedules/tick`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  const getStatusBadge = (status: string) => {
    const map = {
      completed: 'badge-green',
      pending: 'badge-amber',
      failed: 'badge-red',
    }
    return map[status as keyof typeof map] || 'badge-brand'
  }

  return (
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Reports
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Generate and schedule comprehensive platform reports
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="stat-value">{data?.total ?? 0}</div>
          <div className="stat-label">Reports Generated</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">{schedules?.length ?? 0}</div>
          <div className="stat-label">Active Schedules</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-value">3</div>
          <div className="stat-label">Report Types</div>
        </div>
      </div>

      {/* Generate Report */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Generate New Report
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            placeholder="Report type (e.g. po_spend)"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{
              width: '120px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            {generate.isPending ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.18s' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            placeholder="Filter by report type"
            style={{
              flex: 1,
              minWidth: '200px',
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

      {/* Reports Table */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Generated Reports
          </h3>
          <span className="badge badge-brand">{data?.total ?? 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading reports…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Format</th>
                  <th>By</th>
                  <th>Created</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {(data?.reports ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{r.id.slice(0, 8)}…</td>
                    <td>{r.report_type}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.title}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{r.format}</td>
                    <td>{r.generated_by}</td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ color: r.error ? '#ef4444' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {r.error ? 'Yes' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.reports.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No reports yet. Generate one above.
          </div>
        )}
      </div>

      {/* Schedules */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.25s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Report Schedules
          </h3>
          <span className="badge badge-brand">{schedules?.length ?? 0} total</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            placeholder="Schedule report type"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={() => createSchedule.mutate()}
            disabled={createSchedule.isPending}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            {createSchedule.isPending ? 'Creating…' : 'New Schedule'}
          </button>
          <button
            onClick={() => tick.mutate()}
            disabled={tick.isPending}
            className="btn btn-ghost"
            style={{ minWidth: '140px' }}
          >
            {tick.isPending ? 'Running…' : 'Run Due (Tick)'}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Interval</th>
                <th>Enabled</th>
                <th>By</th>
                <th>Created</th>
                <th>Next Run</th>
              </tr>
            </thead>
            <tbody>
              {(schedules ?? []).map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.report_type}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.interval}</td>
                  <td>
                    <span className={`badge ${s.enabled ? 'badge-green' : 'badge-red'}`}>
                      {s.enabled ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{s.created_by}</td>
                  <td className="mono" style={{ fontSize: '0.8rem' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="mono" style={{ fontSize: '0.8rem' }}>
                    {s.next_run_at ? new Date(s.next_run_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!schedules || schedules.length === 0) && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No schedules yet.
          </div>
        )}
      </div>
    </div>
  )
}
