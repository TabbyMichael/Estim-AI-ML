'use client'

export const dynamic = 'force-dynamic'

import nextDynamic from 'next/dynamic'
import { useState } from 'react'
import { GeoMapSummary } from '@/components/geospatial-map'

// react-leaflet touches `window` at module scope, so the canvas must only be
// evaluated in the browser. Loading it with `ssr: false` keeps the server
// render free of browser globals.
const GeoMap = nextDynamic(() => import('@/components/geo-map-canvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 320,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
      }}
    >
      Loading map…
    </div>
  ),
})

const SITES = [
  { id: '1', name: 'London Hub', lat: 51.5074, lng: -0.1278, status: 'active' },
  { id: '2', name: 'Frankfurt', lat: 50.1109, lng: 8.6821, status: 'active' },
  { id: '3', name: 'New York', lat: 40.7128, lng: -74.006, status: 'maintenance' },
  { id: '4', name: 'Toronto', lat: 43.6532, lng: -79.3832, status: 'active' },
  { id: '5', name: 'Tokyo', lat: 35.6762, lng: 139.6503, status: 'inspection' },
  { id: '6', name: 'Shanghai', lat: 31.2304, lng: 121.4737, status: 'active' },
]

export default function GeographicMapPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const filtered = statusFilter
    ? SITES.filter((s) => s.status === statusFilter)
    : SITES

  return (
    <>
      <div className="page-header">
        <div className="animate-fade-in">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Geographic Visualization
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Site markers and geospatial intelligence.
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Filters</h3>
            <div className="flex flex-wrap gap-2">
              {(['active', 'maintenance', 'inspection'] as const).map((f) => (
                <button
                  key={f}
                  className={`btn ${statusFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setStatusFilter(statusFilter === f ? null : f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="card animate-slide-up" style={{ padding: '0' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontWeight: 600 }}>Sites Map</h3>
            </div>
            <div style={{ height: 320, position: 'relative' }}>
              <GeoMap sites={filtered} />
            </div>
          </div>

          <div className="card animate-slide-up" style={{ padding: '1rem' }}>
            <GeoMapSummary sites={filtered} />
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Lat</th>
                  <th>Lng</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td className="mono">{s.lat.toFixed(4)}</td>
                    <td className="mono">{s.lng.toFixed(4)}</td>
                    <td className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                      {s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}