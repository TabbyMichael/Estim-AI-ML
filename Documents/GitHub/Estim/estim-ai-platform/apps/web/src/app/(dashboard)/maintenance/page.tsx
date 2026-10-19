'use client'

export const dynamic = 'force-dynamic'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Equipment = {
  id: string
  name: string
  equipment_type: string
  status: string
  health_score?: string
  last_maintenance?: string
}

export default function MaintenancePage() {
  const qc = useQueryClient()
  const [name, setName] = useState('Crane-1')
  const [type, setType] = useState('crane')
  const { data, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => (await axios.get(`${API}/maintenance/equipment`)).data,
  })
  const create = useMutation({
    mutationFn: async () => (await axios.post(`${API}/maintenance/equipment`, {
      name, equipment_type: type,
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  })

  const getStatusBadge = (status: string) => {
    const map = {
      healthy: 'badge-green',
      warning: 'badge-amber',
      critical: 'badge-red',
    }
    return map[status as keyof typeof map] || 'badge-brand'
  }

  const getHealthColor = (score?: string) => {
    if (!score) return 'var(--text-muted)'
    const num = parseFloat(score)
    if (num >= 80) return '#22c55e'
    if (num >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Predictive Maintenance
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Equipment failure prediction and health monitoring
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-value">3</div>
          <div className="stat-label">Equipment Tracked</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">85%</div>
          <div className="stat-label">Avg Health Score</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#ef4444' } as React.CSSProperties}>
          <div className="stat-value">1</div>
          <div className="stat-label">Needs Attention</div>
        </div>
      </div>

      {/* Create Form */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Register Equipment
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Equipment Name"
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
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: '150px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="crane">Crane</option>
            <option value="excavator">Excavator</option>
            <option value="bulldozer">Bulldozer</option>
            <option value="truck">Truck</option>
          </select>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="btn btn-primary"
            style={{ minWidth: '140px' }}
          >
            {create.isPending ? 'Registering…' : 'Register'}
          </button>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Equipment Registry
          </h3>
          <span className="badge badge-brand">{data?.equipment?.length || 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading equipment…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Health Score</th>
                  <th>Last Maintenance</th>
                </tr>
              </thead>
              <tbody>
                {(data?.equipment ?? []).map((e: Equipment) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{e.equipment_type}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: getHealthColor(e.health_score) }}>
                      {e.health_score ? `${e.health_score}%` : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {e.last_maintenance ? new Date(e.last_maintenance).toLocaleDateString() : '—'}
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
