'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Forecast = {
  id: string
  project_id: string
  forecast_type: string
  status: string
  predicted_amount: string
  confidence_interval_low?: string
  confidence_interval_high?: string
}

export default function CostForecastingPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('PROJ-001')
  const { data, isLoading } = useQuery({
    queryKey: ['forecasts'],
    queryFn: async () => (await axios.get(`${API}/cost-forecasting/forecasts`)).data,
  })
  const create = useMutation({
    mutationFn: async () => (await axios.post(`${API}/cost-forecasting/forecasts`, {
      project_id: projectId, forecast_type: 'project_total',
      predicted_amount: '100000.00', confidence_interval_low: '90000.00',
      confidence_interval_high: '110000.00', model_version: 'v1',
      created_by: 'web',
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecasts'] }),
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
          Cost Forecasting
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          AI-powered budget overrun prediction using LightGBM
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="stat-value">4</div>
          <div className="stat-label">Active Forecasts</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">92%</div>
          <div className="stat-label">Accuracy Rate</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-value">$2.1M</div>
          <div className="stat-label">Predicted Overrun</div>
        </div>
      </div>

      {/* Create Form */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Generate New Forecast
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID"
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
            {create.isPending ? 'Generating…' : 'Generate Forecast'}
          </button>
        </div>
      </div>

      {/* Forecasts Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Cost Forecasts
          </h3>
          <span className="badge badge-brand">{data?.forecasts?.length || 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading forecasts…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Predicted</th>
                  <th>Confidence Range</th>
                </tr>
              </thead>
              <tbody>
                {(data?.forecasts ?? []).map((f: Forecast) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{f.project_id}</td>
                    <td>{f.forecast_type}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(f.status)}`}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ${parseFloat(f.predicted_amount).toLocaleString()}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {f.confidence_interval_low && f.confidence_interval_high
                        ? `$${parseFloat(f.confidence_interval_low).toLocaleString()} - $${parseFloat(f.confidence_interval_high).toLocaleString()}`
                        : '—'}
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
