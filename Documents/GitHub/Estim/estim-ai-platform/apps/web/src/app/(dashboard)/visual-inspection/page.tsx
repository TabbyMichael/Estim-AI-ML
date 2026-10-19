'use client'

export const dynamic = 'force-dynamic'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Inspection = {
  id: string
  project_id: string
  title: string
  status: string
  defect_count?: number
  created_at: string
}

export default function VisualInspectionPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('PROJ-001')
  const [title, setTitle] = useState('Site Walk')
  const { data, isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: async () => (await axios.get(`${API}/visual-inspection/inspections`)).data,
  })
  const create = useMutation({
    mutationFn: async () => (await axios.post(`${API}/visual-inspection/inspections`, {
      project_id: projectId, title,
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  })

  const getStatusBadge = (status: string) => {
    const map = {
      completed: 'badge-green',
      in_progress: 'badge-amber',
      pending: 'badge-brand',
    }
    return map[status as keyof typeof map] || 'badge-brand'
  }

  return (
    <>
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Visual Inspection
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          AI-powered image analysis and defect detection using YOLO
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#a855f7' } as React.CSSProperties}>
          <div className="stat-value">0</div>
          <div className="stat-label">Total Inspections</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#ef4444' } as React.CSSProperties}>
          <div className="stat-value">0</div>
          <div className="stat-label">Defects Found</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">98%</div>
          <div className="stat-label">Detection Accuracy</div>
        </div>
      </div>

      {/* Create Form */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Create New Inspection
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID"
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Inspection Title"
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
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            {create.isPending ? 'Creating…' : 'Create Inspection'}
          </button>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Inspections
          </h3>
          <span className="badge badge-brand">{data?.inspections?.length || 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading inspections…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Defects</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(data?.inspections ?? []).map((i: Inspection) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{i.title || i.id}</td>
                    <td>{i.project_id}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(i.status)}`}>
                        {i.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: i.defect_count && i.defect_count > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      {i.defect_count ?? 0}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {new Date(i.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
