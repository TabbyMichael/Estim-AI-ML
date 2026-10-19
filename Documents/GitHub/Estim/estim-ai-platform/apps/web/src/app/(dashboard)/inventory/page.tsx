'use client'

export const dynamic = 'force-dynamic'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type Snapshot = {
  id: string
  material_id: string
  site_id: string
  quantity_on_hand: string
  recorded_at: string
}

export default function InventoryPage() {
  const qc = useQueryClient()
  const [material, setMaterial] = useState('MAT-001')
  const [site, setSite] = useState('SITE-001')
  const [quantity, setQuantity] = useState('100')
  const { data, isLoading } = useQuery({
    queryKey: ['snapshots'],
    queryFn: async () => (await axios.get(`${API}/inventory/snapshots`)).data,
  })
  const create = useMutation({
    mutationFn: async () => (await axios.post(`${API}/inventory/snapshots`, {
      material_id: material, site_id: site, quantity_on_hand: quantity,
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snapshots'] }),
  })

  return (
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Inventory AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Demand forecasting and stockout prevention for construction materials
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">8</div>
          <div className="stat-label">Active Snapshots</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-value">2</div>
          <div className="stat-label">Low Stock Alerts</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="stat-value">94%</div>
          <div className="stat-label">Forecast Accuracy</div>
        </div>
      </div>

      {/* Create Form */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem', animationDelay: '0.15s' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Record Stock Snapshot
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="Material ID"
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
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="Site ID"
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
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            type="number"
            style={{
              width: '120px',
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
            {create.isPending ? 'Recording…' : 'Record Snapshot'}
          </button>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Stock Snapshots
          </h3>
          <span className="badge badge-brand">{data?.snapshots?.length || 0} total</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading snapshots…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material ID</th>
                  <th>Site ID</th>
                  <th>Quantity</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {(data?.snapshots ?? []).map((s: Snapshot) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.material_id}</td>
                    <td>{s.site_id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {parseFloat(s.quantity_on_hand).toLocaleString()}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {new Date(s.recorded_at).toLocaleDateString()}
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
