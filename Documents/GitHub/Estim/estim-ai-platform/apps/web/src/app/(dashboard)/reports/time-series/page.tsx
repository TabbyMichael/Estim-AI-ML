'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useChartExport } from '@/components/charts'
import { ChartCard, TimeSeriesLine } from '@/components/charts'

const months = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(2025, 0, 1)
  d.setMonth(d.getMonth() + i)
  return d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
})

const series = {
  actual: [54, 58, 62, 50, 60, 64, 56, 66, 70, 62, 72, 78, 70, 76, 84, 78, 88, 94, 86, 96, 102, 96, 106, 112],
  forecast: [58, 62, 66, 62, 64, 68, 64, 72, 74, 68, 76, 82, 76, 80, 88, 84, 92, 98, 92, 100, 104, 100, 110, 114],
}

/** Time-series analysis (Roadmap 2.2) — date range filter + forecast vs actual. */
export default function TimeSeriesPage() {
  const [fmt, setFmt] = useState<'currency' | 'number'>('currency')
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(23)
  const { exportPng } = useChartExport()

  const actual = series.actual.slice(start, end + 1)
  const forecast = series.forecast.slice(start, end + 1)

  const rows = months.slice(start, end + 1).map((m, i) => ({
    month: m,
    actual: fmt === 'currency' ? `$${actual[i].toLocaleString()}` : String(actual[i]),
    forecast: fmt === 'currency' ? `$${forecast[i].toLocaleString()}` : String(forecast[i]),
    diff: forecast[i] - actual[i],
  }))

  return (
    <>
      <div className="page-header">
        <div className="animate-fade-in">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Time-Series Analysis</h1>
        </div>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
          <ChartCard title="Spend trend" subtitle="Forecast vs actual" height={320}>
            <div style={{ position: 'relative', width: '100%' }}>
              <TimeSeriesLine
                data={months.map((m, i) => ({
                  month: m,
                  actual: series.actual[i],
                  forecast: series.forecast[i],
                }))}
                xKey="month"
                series={['actual', 'forecast']}
                colors={['#22c55e', '#6366f1']}
                showBrush
              />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '0.75rem', alignSelf: 'flex-end' }} onClick={() => exportPng()}>Export PNG</button>
          </ChartCard>

          <div className="card animate-slide-up" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label>Start</label>
                <select className="input" value={start} onChange={(e) => setStart(Number(e.target.value))} style={{ minWidth: 80 }}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{months[i]}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label>End</label>
                <select className="input" value={end} onChange={(e) => setEnd(Number(e.target.value))} style={{ minWidth: 80 }}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{months[i]}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label>Format</label>
                <select className="input" value={fmt} onChange={(e) => setFmt(e.target.value as any)} style={{ minWidth: 120 }}>
                  <option value="currency">Currency</option>
                  <option value="number">Number</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Actual</th>
                    <th>Forecast</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.month}>
                      <td style={{ fontSize: '0.8rem' }}>{r.month}</td>
                      <td style={{ fontWeight: 500 }}>{r.actual}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.forecast}</td>
                      <td style={{ color: r.diff >= 0 ? 'var(--brand)' : 'var(--danger)' }}>
                        {r.diff >= 0 ? '+' : ''}{r.diff.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}