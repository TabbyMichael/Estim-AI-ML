'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Anomaly = {
  id: string
  purchase_order_id: string
  anomaly_type: string
  severity: string
  description: string
  detected_at: string
}

export default function ProcurementPage() {
  const qc = useQueryClient()
  const [poId, setPoId] = useState('PO-001')
  const { data, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: async () => (await axios.get(`${API}/procurement/anomalies`)).data,
  })
  const create = useMutation({
    mutationFn: async () => (await axios.post(`${API}/procurement/anomalies`, {
      purchase_order_id: poId, anomaly_type: 'price_spike',
      severity: 'high', description: 'Price exceeds baseline by 40%',
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anomalies'] }),
  })

  const getSeverityBadge = (severity: string) => {
    const map = {
      high: 'badge-red',
      medium: 'badge-amber',
      low: 'badge-green',
    }
    return map[severity as keyof typeof map] || 'badge-brand'
  }

  return (
    <>
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Procurement AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Fraud detection and price anomaly analysis for purchase orders
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#f97316' } as React.CSSProperties}>
          <div className="stat-value">12</div>
          <div className="stat-label">Anomalies Detected</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#ef4444' } as React.CSSProperties}>
          <div className="stat-value">3</div>
          <div className="stat-label">High Severity</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">$45K</div>
          <div className="stat-label">Savings Identified</div>
        </div>
      </div>

      {/* Create Form */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Analyze Purchase Order
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
            placeholder="Purchase Order ID"
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
            {create.isPending ? 'Analyzing…' : 'Analyze PO'}
          </button>
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Detected Anomalies
          </h3>
          <span className="badge badge-brand">{data?.anomalies?.length || 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading anomalies…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO ID</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Detected</th>
                </tr>
              </thead>
              <tbody>
                {(data?.anomalies ?? []).map((anomaly: Anomaly) => (
                  <tr key={anomaly.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{anomaly.purchase_order_id}</td>
                    <td>{anomaly.anomaly_type}</td>
                    <td>
                      <span className={`badge ${getSeverityBadge(anomaly.severity)}`}>
                        {anomaly.severity}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>{anomaly.description}</td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {new Date(anomaly.detected_at).toLocaleDateString()}
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
