'use client'

export const dynamic = 'force-dynamic'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Document = {
  id: string
  filename: string
  status: string
  indexed_at?: string
}

export default function DocumentsPage() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string>('')
  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await axios.get(`${API}/documents`)).data,
  })
  const ask = useMutation({
    mutationFn: async () => (await axios.post(`${API}/documents/ask`, { query })).data,
    onSuccess: (d) => { setAnswer(d.answer); qc.invalidateQueries({ queryKey: ['documents'] }) },
  })

  const getStatusBadge = (status: string) => {
    const map = {
      indexed: 'badge-green',
      processing: 'badge-amber',
      failed: 'badge-red',
    }
    return map[status as keyof typeof map] || 'badge-brand'
  }

  return (
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Document AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Intelligent document processing, indexing, and semantic search
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#06b6d4' } as React.CSSProperties}>
          <div className="stat-value">{data?.total ?? 0}</div>
          <div className="stat-label">Indexed Documents</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="stat-value">125</div>
          <div className="stat-label">Queries Today</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">96%</div>
          <div className="stat-label">Relevance Score</div>
        </div>
      </div>

      {/* AI Query */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Ask Your Documents
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your documents..."
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={() => ask.mutate()}
            disabled={ask.isPending || !query}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            {ask.isPending ? 'Searching…' : 'Ask AI'}
          </button>
        </div>
        {answer && (
          <div className="card-elevated" style={{ marginTop: '1rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Answer:
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {answer}
            </div>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Indexed Documents
          </h3>
          <span className="badge badge-brand">{data?.total ?? 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading documents…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>Indexed</th>
                </tr>
              </thead>
              <tbody>
                {(data?.documents ?? []).map((d: Document) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.filename}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {d.indexed_at ? new Date(d.indexed_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
