'use client'

/**
 * Notification center (Roadmap 1.3):
 * bell icon with unread badge, slide-in drawer with the notification
 * list, mark-read / mark-all-read and live updates via the realtime
 * WebSocket (notification.created events invalidate the query cache).
 */

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuth } from '@/lib/auth-context'
import { useRealtimeEvent } from '@/lib/realtime-context'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type Notification = {
  id: string
  user_id: string
  channel: string
  subject: string
  body: string
  status: string
  event_type: string
  created_at: string
  read_at?: string | null
}

type ListResponse = {
  notifications: Notification[]
  total: number
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const userId = user?.id

  const { data } = useQuery<ListResponse>({
    enabled: !!userId,
    queryKey: ['notifications', userId, 'recent'],
    queryFn: async () => (
      await axios.get(`${API}/notifications`, { params: { user_id: userId, limit: 15 } })
    ).data,
  })

  // Live updates: new notification pushes over the WebSocket
  useRealtimeEvent('notification.created', () => {
    qc.invalidateQueries({ queryKey: ['notifications', userId] })
  })

  const markRead = useMutation({
    mutationFn: async (id: string) =>
      (await axios.post(`${API}/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const markAll = useMutation({
    mutationFn: async () =>
      (await axios.post(`${API}/notifications/read-all`, { params: { user_id: userId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const items = data?.notifications ?? []
  const unread = items.filter((n) => n.status === 'sent').length

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
        style={{
          position: 'relative', padding: '0.45rem', borderRadius: 8,
          background: 'transparent', border: '1px solid var(--border-subtle)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16,
            borderRadius: 8, background: '#ef4444', color: '#fff',
            fontSize: '0.62rem', fontWeight: 700, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360,
            maxWidth: '92vw', maxHeight: 480, overflowY: 'auto', zIndex: 100,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)',
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending || unread === 0}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--brand-light)',
                  fontSize: '0.75rem', cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notifications yet.
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => n.status === 'sent' && markRead.mutate(n.id)}
                  style={{
                    padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)',
                    cursor: n.status === 'sent' ? 'pointer' : 'default',
                    background: n.status === 'sent' ? 'var(--brand-dim)' : 'transparent',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.5rem', marginBottom: 2,
                  }}>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)',
                    }}>
                      {n.subject}
                    </span>
                    <span className="badge" style={{
                      fontSize: '0.62rem', flexShrink: 0,
                      background: n.status === 'read' ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.15)',
                      color: n.status === 'read' ? '#22c55e' : 'var(--brand-light)',
                    }}>
                      {n.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{
                display: 'block', padding: '0.7rem 1rem', textAlign: 'center',
                fontSize: '0.8rem', color: 'var(--brand-light)', textDecoration: 'none',
              }}
            >
              View all &amp; settings →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
