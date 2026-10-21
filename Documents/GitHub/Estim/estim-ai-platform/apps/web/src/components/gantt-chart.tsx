'use client'

import { useState } from 'react'

export type Task = {
  id: string
  name: string
  owner: string
  start: number
  duration: number
  progress: number
  status: 'done' | 'in-progress' | 'at-risk' | 'pending'
}

export function GanttChart({
  tasks,
  onUpdateProgress,
  height = 320,
}: {
  tasks: Task[]
  onUpdateProgress?: (id: string, v: number) => void
  height?: number
}) {
  const [dragId, setDragId] = useState<string | null>(null)

  const maxDuration = Math.max(1, ...tasks.map((t) => t.duration))
  const now = 12

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-elevated)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
            <th style={{ position: 'sticky', left: 0, background: 'var(--bg-elevated)', padding: '0.5rem', textAlign: 'left' }}>Task</th>
            {tasks.map((t) => (
              <th key={t.id} style={{ background: 'var(--bg-elevated)', padding: '0.5rem', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                {t.start}
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  d{t.duration}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td style={{ padding: '0.5rem', background: dragId === t.id ? 'var(--brand-bg)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.name}</span>
                  <span className="badge" style={{ fontSize: '0.65rem' }}>
                    {t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'in progress' : t.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                  {t.owner.split(' ').map((n) => (
                    <div key={n} style={{
                      borderRadius: '4px', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: '0.6rem', fontWeight: 700,
                    }}>
                      {n.charAt(0)}
                    </div>
                  ))}
                </div>
              </td>
              {tasks.map((s) => {
                const isTarget = s.id === t.id
                const left = t.start
                const widthPct = (t.duration / maxDuration) * 100
                const x = left + (t.start / maxDuration) * 100
                const barW = widthPct
                return (
                  <td key={s.id} style={{ padding: '0.25rem 0.5rem', textAlign: 'center', borderRight: '1px solid var(--border)', verticalAlign: 'top' }}>
                    {isTarget ? (
                      dragId === t.id ? (
                        <input
                          className="input"
                          style={{ width: '100%', padding: '0.2rem 0.3rem', fontSize: '0.7rem' }}
                          value={t.progress}
                          onChange={(e) => { const v = Number(e.target.value); onUpdateProgress?.(t.id, v); setDragId(null) }}
                        />
                      ) : (
                        <div
                          style={{
                            borderRadius: '4px', height: 18, background: t.progress >= 100 ? 'var(--success-bg)' : t.progress > 0 ? 'var(--brand-bg)' : 'var(--border-subtle)',
                            color: t.progress >= 100 ? 'var(--success)' : t.progress > 0 ? 'var(--brand)' : 'var(--text-muted)',
                            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          }}
                          onClick={() => setDragId(t.id)}
                        >
                          {t.progress}%
                        </div>
                      )
                    ) : (
                      <div
                        style={{
                          height: 16, borderRadius: 4, background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
                        }}
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}