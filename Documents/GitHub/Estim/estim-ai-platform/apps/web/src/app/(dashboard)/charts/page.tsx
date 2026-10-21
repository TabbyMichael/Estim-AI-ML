'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  TimeSeriesLine, Bars, Areas, Donut, ScatterPlot,
  ChartCard, useChartExport,
} from '@/components/charts'

const months = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(2025, 0, 1)
  d.setMonth(d.getMonth() + i)
  return d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
})

const MOOD = {
  line: [72, 68, 74, 70, 78, 82, 76, 84, 90, 86, 94, 100, 96, 102, 108, 104, 112, 118, 114, 120, 126, 132, 128, 136],
  bar: [54, 58, 62, 50, 60, 64, 56, 66, 70, 62, 72, 78, 70, 76, 84, 78, 88, 94, 86, 96, 102, 96, 106, 112],
}

/** Charts gallery (Roadmap 2.1.3) — live preview of every reusable chart with PNG export. */
export default function ChartsGalleryPage() {
  const [mode, setMode] = useState<'line' | 'bar' | 'area' | 'donut' | 'scatter'>('line')
  const [series, setSeries] = useState<string[]>(['Forecast', 'Actual'])
  const { ref: lineRef, exportPng: exportLine } = useChartExport()
  const { ref: barRef, exportPng: exportBar } = useChartExport()
  const { ref: areaRef, exportPng: exportArea } = useChartExport()
  const { ref: donutRef, exportPng: exportDonut } = useChartExport()
  const { ref: scatterRef, exportPng: exportScatter } = useChartExport()

  const chartData = months.map((m, i) => ({
    month: m,
    forecast: MOOD.line[i],
    actual: MOOD.bar[i],
  }))

  return (
    <>
      <div className="page-header">
        <div className="animate-fade-in">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Charts Gallery</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Reusable chart components with analytics. Switch datasets and export PNG.
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="card animate-slide-up" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex flex-wrap gap-2">
            {(['line', 'bar', 'area', 'donut', 'scatter'] as const).map((m) => (
              <button key={m} className="btn btn-ghost" onClick={() => setMode(m)}>
                {m === 'area' ? 'Area' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <select className="input" value="currency" onChange={() => {}} style={{ minWidth: 140 }}>
            <option value="currency">Currency</option>
          </select>
        </div>

        {mode === 'line' && (
          <ChartCard title="Time series - spend by module" subtitle="Forecast vs actual (24 months)" height={300}>
            <div ref={lineRef} style={{ position: 'relative', width: '100%' }}>
              <TimeSeriesLine data={chartData} xKey="month" series={series} colors={['#6366f1', '#22c55e']} showBrush />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '0.75rem', alignSelf: 'flex-end' }} onClick={() => exportLine()}>Export PNG</button>
          </ChartCard>
        )}

        {mode === 'bar' && (
          <ChartCard title="Distribution - budget categories" subtitle="Current period allocation" height={300}>
            <div ref={barRef} style={{ position: 'relative', width: '100%' }}>
              <Bars data={chartData} xKey="month" bars={series} colors={['#6366f1', '#22c55e', '#f59e0b']} />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '0.75rem', alignSelf: 'flex-end' }} onClick={() => exportBar()}>Export PNG</button>
          </ChartCard>
        )}

        {mode === 'area' && (
          <ChartCard title="Volume - units over time" subtitle="Forecast vs actual" height={300}>
            <div ref={areaRef} style={{ position: 'relative', width: '100%' }}>
              <Areas data={chartData} xKey="month" areas={series} colors={['#6366f1', '#22c55e']} />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '0.75rem', alignSelf: 'flex-end' }} onClick={() => exportArea()}>Export PNG</button>
          </ChartCard>
        )}

        {mode === 'donut' && (
          <ChartCard title="Work status" subtitle="Tickets by state" height={280}>
            <div ref={donutRef} style={{ position: 'relative', width: '100%' }}>
              <Donut data={[
                { name: 'Offline', value: 22 },
                { name: 'Pending', value: 8 },
                { name: 'In progress', value: 15 },
                { name: 'Review', value: 7 },
                { name: 'Done', value: 48 },
              ]} nameKey="name" valueKey="value" />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '0.75rem', alignSelf: 'flex-end' }} onClick={() => exportDonut()}>Export PNG</button>
          </ChartCard>
        )}

        {mode === 'scatter' && (
          <ChartCard title="Correlation - risk vs spend" subtitle="Per project (20 points)" height={280}>
            <div ref={scatterRef} style={{ position: 'relative', width: '100%' }}>
              <ScatterPlot
                data={Array.from({ length: 20 }, (_, i) => ({
                  x: Math.round(20 + i * 4.2 + (Math.random() - 0.5) * 12),
                  y: Math.round(30 + i * 2.4 + (Math.random() - 0.5) * 15),
                }))}
                xKey="x" yKey="y" color="#6366f1" />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '0.75rem', alignSelf: 'flex-end' }} onClick={() => exportScatter()}>Export PNG</button>
          </ChartCard>
        )}
      </div>
    </>
  )
}