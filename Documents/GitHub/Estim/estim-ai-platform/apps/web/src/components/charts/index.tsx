'use client'

/**
 * Reusable chart components (Roadmap 2.1).
 *
 * ChartCard: consistent frame (title, subtitle, actions, export PNG).
 * Line/Bar/Pie/Area/Scatter: typed Recharts wrappers with tooltips,
 * legends and brush-based zoom.
 */

import { useCallback, useRef } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type SeriesDatum = Record<string, string | number>

export function ChartCard({
  title, subtitle, height = 280, actions, children,
}: {
  title: string
  subtitle?: string
  height?: number
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{title}</h3>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
      </div>
    </div>
  )
}

/** Export the nearest chart SVG as a download. */
export function useChartExport() {
  const ref = useRef<HTMLDivElement>(null)
  const exportPng = useCallback((filename = 'chart.png') => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.replace(/\.png$/, '.svg')
    a.click()
    URL.revokeObjectURL(url)
  }, [])
  return { ref, exportPng }
}

const AXIS = { stroke: 'var(--text-muted)', fontSize: 11 }
const GRID = { stroke: 'var(--border-subtle)' }
const TOOLTIP = {
  contentStyle: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 12,
  },
}

export function TimeSeriesLine({
  data, xKey, series, colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'],
  showBrush = true, height = 280,
}: {
  data: SeriesDatum[]
  xKey: string
  series: string[]
  colors?: string[]
  showBrush?: boolean
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid {...GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={AXIS} />
        <YAxis tick={AXIS} width={48} />
        <Tooltip {...TOOLTIP} />
        <Legend />
        {series.map((s, i) => (
          <Line key={s} type="monotone" dataKey={s} stroke={colors[i % colors.length]}
            strokeWidth={2} dot={false} />
        ))}
        {showBrush && data.length > 8 && (
          <Brush dataKey={xKey} height={20} stroke="var(--brand)" fill="var(--bg-elevated)" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function Bars({ data, xKey, bars, colors = ['#6366f1'], height = 280 }: {
  data: SeriesDatum[]
  xKey: string
  bars: string[]
  colors?: string[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid {...GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={AXIS} />
        <YAxis tick={AXIS} width={48} />
        <Tooltip {...TOOLTIP} />
        <Legend />
        {bars.map((b, i) => (
          <Bar key={b} dataKey={b} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Areas({ data, xKey, areas, colors = ['#6366f1', '#22c55e'], height = 280 }: {
  data: SeriesDatum[]
  xKey: string
  areas: string[]
  colors?: string[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          {areas.map((a, i) => (
            <linearGradient key={a} id={`grad-${a}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={AXIS} />
        <YAxis tick={AXIS} width={48} />
        <Tooltip {...TOOLTIP} />
        <Legend />
        {areas.map((a, i) => (
          <Area key={a} type="monotone" dataKey={a} stroke={colors[i % colors.length]}
            fill={`url(#grad-${a})`} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, nameKey = 'name', valueKey = 'value', height = 280 }: {
  data: SeriesDatum[]
  nameKey?: string
  valueKey?: string
  height?: number
}) {
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#f97316']
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="55%" outerRadius="80%">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ScatterPlot({ data, xKey, yKey, color = '#6366f1', height = 280 }: {
  data: SeriesDatum[]
  xKey: string
  yKey: string
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart>
        <CartesianGrid {...GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={AXIS} type="number" />
        <YAxis dataKey={yKey} tick={AXIS} type="number" width={48} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={TOOLTIP.contentStyle}
        />
        <Scatter data={data} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

