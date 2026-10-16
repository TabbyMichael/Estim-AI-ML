'use client'

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

  return (
    <main style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Reports
      </h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Phase 6.2 — Generate and schedule platform reports.
      </p>

      <section style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input value={reportType} onChange={(e) => setReportType(e.target.value)}
          placeholder="Report type (e.g. po_spend)" style={inputStyle} />
        <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle}>
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
        <button onClick={() => generate.mutate()} disabled={generate.isPending}
          style={buttonStyle('#6366f1')}>
          {generate.isPending ? 'Generating…' : 'Generate report'}
        </button>
      </section>

      <section style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <input value={filterType} onChange={(e) => setFilterType(e.target.value)}
          placeholder="Filter by report type" style={inputStyle} />
      </section>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}>Reports</h2>
      {isLoading ? <p>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>ID</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Type</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Title</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Format</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>By</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Created</th>
              <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {(data?.reports ?? []).map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem', fontSize: '0.9rem', fontFamily: 'monospace' }}>{r.id.slice(0, 8)}…</td>
                <td style={{ padding: '0.5rem' }}>{r.report_type}</td>
                <td style={{ padding: '0.5rem' }}>{r.title}</td>
                <td style={{ padding: '0.5rem' }}>{r.status}</td>
                <td style={{ padding: '0.5rem' }}>{r.format}</td>
                <td style={{ padding: '0.5rem' }}>{r.generated_by}</td>
                <td style={{ padding: '0.5rem' }}>{r.created_at}</td>
                <td style={{ padding: '0.5rem', color: '#ef4444', fontSize: '0.85rem' }}>{r.error ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.reports.length === 0 && <p style={{ color: '#64748b' }}>No reports yet. Generate one above.</p>}

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '2rem 0 0.5rem' }}>Schedules</h2>
      <section style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={reportType} onChange={(e) => setReportType(e.target.value)}
          placeholder="Schedule report type" style={inputStyle} />
        <button onClick={() => createSchedule.mutate()} disabled={createSchedule.isPending}
          style={buttonStyle('#22c55e')}>
          {createSchedule.isPending ? 'Creating…' : 'New schedule'}
        </button>
        <button onClick={() => tick.mutate()} disabled={tick.isPending}
          style={buttonStyle('#f59e0b')}>
          {tick.isPending ? 'Ticking…' : 'Run due (tick)'}
        </button>
      </section>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Type</th>
            <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Interval</th>
            <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Enabled</th>
            <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>By</th>
            <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Created</th>
            <th style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Next run</th>
          </tr>
        </thead>
        <tbody>
          {(schedules ?? []).map((s) => (
            <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.5rem' }}>{s.report_type}</td>
              <td style={{ padding: '0.5rem' }}>{s.interval}</td>
              <td style={{ padding: '0.5rem' }}>{String(s.enabled)}</td>
              <td style={{ padding: '0.5rem' }}>{s.created_by}</td>
              <td style={{ padding: '0.5rem' }}>{s.created_at}</td>
              <td style={{ padding: '0.5rem' }}>{s.next_run_at ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(!schedules || schedules.length === 0) && <p style={{ color: '#64748b' }}>No schedules yet.</p>}
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
