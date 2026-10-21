'use client'

export function GeoMapSummary({
  sites,
}: {
  sites: { name: string; lat: number; lng: number; status: string }[]
}) {
  const active = sites.filter((s) => s.status === 'active').length
  const flagged = sites.filter((s) => s.status !== 'active').length
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
        <div className="stat-value">{active}</div>
        <div className="stat-label">Active sites</div>
      </div>
      <div className="stat-card" style={{ '--accent': '#ef4444' } as React.CSSProperties}>
        <div className="stat-value">{flagged}</div>
        <div className="stat-label">Flagged sites</div>
      </div>
      <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
        <div className="stat-value">{sites.length}</div>
        <div className="stat-label">Total sites</div>
      </div>
    </div>
  )
}