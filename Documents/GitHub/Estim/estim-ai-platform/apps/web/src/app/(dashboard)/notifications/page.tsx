'use client'

export const dynamic = 'force-dynamic'

/**
 * Notifications page (Roadmap 1.3):
 * full notification list with filters, stats, mark-read actions and a
 * notification settings section (per-channel / per-event preferences).
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuth } from '@/lib/auth-context'
import { useRealtimeEvent } from '@/lib/realtime-context'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Notification = {
  id: string
  subject: string
  body: string
  status: string
  channel: string
  event_type: string
  created_at: string
  read_at?: string | null
}

type ListResponse = { notifications: Notification[]; total: number }
type Stats = { total: number; unread: number; read: number; failed: number }
type Pref = { user_id: string; channel: string; event_type: string; enabled: boolean }

const EVENT_TYPES = [
  '*', 'procurement.anomaly.detected', 'cost_forecasting.forecast.updated',
  'inventory.low_stock', 'maintenance.equipment.alert',
  'project_risk.level.changed', 'visual_inspection.completed',
  'document_intelligence.processed', 'reporting.generated',
  'system.announcement',
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const userId = user?.id
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [prefChannel, setPrefChannel] = useState('in_app')
  const [prefEvent, setPrefEvent] = useState('*')
  const [prefEnabled, setPrefEnabled] = useState(true)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications', userId] })

  const { data, isLoading } = useQuery<ListResponse>({
    enabled: !!userId,
    queryKey: ['notifications', userId, statusFilter],
    queryFn: async () => (
      await axios.get(`${API}/notifications`, {
        params: {
          user_id: userId, limit: 100,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      })
    ).data,
  })

  const { data: stats } = useQuery<Stats>({
    enabled: !!userId,
    queryKey: ['notifications', userId, 'stats'],
    queryFn: async () => (
      await axios.get(`${API}/notifications/stats/summary`, { params: { user_id: userId } })
    ).data,
  })

  const { data: prefs } = useQuery<Pref[]>({
    enabled: !!userId,
    queryKey: ['notification-prefs', userId],
    queryFn: async () => (
      await axios.get(`${API}/notifications/${userId}/preferences`)
    ).data,
  })

  useRealtimeEvent('notification.created', invalidate)

  const markRead = useMutation({
    mutationFn: async (id: string) =>
      (await axios.post(`${API}/notifications/${id}/read`)).data,
    onSuccess: invalidate,
  })

  const markAll = useMutation({
    mutationFn: async () =>
      (await axios.post(`${API}/notifications/read-all`, { params: { user_id: userId } })).data,
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => axios.delete(`${API}/notifications/${id}`),
    onSuccess: invalidate,
  })

  const savePref = useMutation({
    mutationFn: async (body: { channel: string; event_type: string; enabled: boolean }) =>
      (await axios.put(`${API}/notifications/${userId}/preferences`, body)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notification-prefs', userId] }),
  })

  const items = (data?.notifications ?? []).filter(
    (n) => !channelFilter || n.channel === channelFilter,
  )

  return (
    <>
      <div className="page-header">
        <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Notifications</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Real-time alerts across all AI modules
            </p>
          </div>
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending || !stats?.unread} className="btn btn-ghost">
            Mark all read
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-slide-up stagger">
          {[
            { label: 'Total', value: stats?.total ?? 0, accent: '#6366f1' },
            { label: 'Unread', value: stats?.unread ?? 0, accent: '#f59e0b' },
            { label: 'Read', value: stats?.read ?? 0, accent: '#22c55e' },
            { label: 'Failed', value: stats?.failed ?? 0, accent: '#ef4444' },
          ].map((s) => (
            <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '0.1s', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input" style={{ minWidth: 160 }}>
            <option value="">All statuses</option>
            <option value="sent">Unread (sent)</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="input" style={{ minWidth: 160 }}>
            <option value="">All channels</option>
            <option value="in_app">In-app</option>
            <option value="email">Email</option>
          </select>
        </div>

        <div className="card animate-slide-up" style={{ animationDelay: '0.15s', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: 600 }}>Notification history</h3>
            <span className="badge badge-brand">{data?.total ?? 0} total</span>
          </div>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notifications match the current filters.
            </div>
          ) : (
            items.map((n) => (
              <div key={n.id} style={{
                padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                background: n.status === 'sent' ? 'var(--brand-dim)' : 'transparent',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{n.subject}</span>
                    <span className="badge" style={{ fontSize: '0.62rem' }}>{n.channel}</span>
                    <span className="badge badge-brand" style={{ fontSize: '0.62rem' }}>{n.event_type}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{n.body}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  {n.status === 'sent' && (
                    <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: '#ef4444' }}
                    onClick={() => remove.mutate(n.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings (Roadmap 1.3 notification settings) */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.2s', marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Notification settings</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Choose which channels deliver which event types. Wildcard (*) applies to all events.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Channel
              <select value={prefChannel} onChange={(e) => setPrefChannel(e.target.value)}
                className="input" style={{ display: 'block', marginTop: 4, minWidth: 140 }}>
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Event type
              <select value={prefEvent} onChange={(e) => setPrefEvent(e.target.value)}
                className="input" style={{ display: 'block', marginTop: 4, minWidth: 260 }}>
                {EVENT_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="checkbox" checked={prefEnabled} onChange={(e) => setPrefEnabled(e.target.checked)} />
              Enabled
            </label>
            <button className="btn btn-primary" disabled={savePref.isPending || !userId}
              onClick={() => savePref.mutate({ channel: prefChannel, event_type: prefEvent, enabled: prefEnabled })}>
              {savePref.isPending ? 'Saving…' : 'Save preference'}
            </button>
          </div>
          {prefs && prefs.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {prefs.map((p) => (
                <span key={`${p.channel}:${p.event_type}`} className="badge"
                  style={{ fontSize: '0.68rem', opacity: p.enabled ? 1 : 0.5 }}>
                  {p.channel} · {p.event_type} · {p.enabled ? 'on' : 'off'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

