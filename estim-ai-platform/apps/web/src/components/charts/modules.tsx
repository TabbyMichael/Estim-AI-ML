'use client'

/**
 * Reusable charts for the module pages: grouped/stacked bars, multi-series
 * lines and a score gauge. Colours come from the shared chart palette so the
 * light and dark themes stay coherent.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { clamp, cn } from '@/lib/utils'
import { chartColor, type ChartTone } from './overview'

export type SeriesDef = {
  key: string
  label: string
  tone: ChartTone
  /** Series sharing a stack id are stacked on top of each other. */
  stackId?: string
  dashed?: boolean
}


type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: number | string | null
  color?: string
}

function ThemedTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  valueFormatter?: (value: number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => {
        if (entry.value === null || entry.value === undefined) return null
        const numeric = typeof entry.value === 'number' ? entry.value : Number(entry.value)
        const display =
          Number.isFinite(numeric) && valueFormatter ? valueFormatter(numeric) : String(entry.value)
        return (
          <p
            key={String(entry.dataKey)}
            className="flex items-center gap-1.5 leading-5 text-muted-foreground"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            {entry.name}
            <span className="ml-auto pl-3 font-medium tabular text-foreground">{display}</span>
          </p>
        )
      })}
    </div>
  )
}

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }

/** Vertical bars, optionally grouped (default) or stacked. */
export function BarSeriesChart<T extends object>({
  data,
  xKey,
  series,
  height = 260,
  stacked = false,
  valueFormatter,
  yWidth = 40,
  pointTones,
  hideY = false,
  className,
}: {
  data: T[]
  xKey: string
  series: SeriesDef[]
  height?: number
  stacked?: boolean
  valueFormatter?: (value: number) => string
  yWidth?: number
  /** Colours each bar individually — only valid with a single series. */
  pointTones?: ChartTone[]
  hideY?: boolean
  className?: string
}) {
  const barRadius: number | [number, number, number, number] = stacked ? 0 : [4, 4, 0, 0]

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="hsl(var(--chart-grid))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            dy={8}
            interval="preserveStartEnd"
            tick={axisTick}
          />
          {hideY ? null : (
            <YAxis
              tickLine={false}
              axisLine={false}
              width={yWidth}
              allowDecimals={false}
              tick={axisTick}
            />
          )}
          <Tooltip
            content={<ThemedTooltip valueFormatter={valueFormatter} />}
            cursor={{ fill: 'hsl(var(--accent) / 0.35)' }}
          />
          {series.map((entry) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.label}
              stackId={entry.stackId ?? (stacked ? 'stack' : undefined)}
              fill={chartColor(entry.tone)}
              radius={barRadius}
              maxBarSize={stacked ? 34 : 30}
            >
              {pointTones && series.length === 1
                ? data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={chartColor(pointTones[index % pointTones.length])}
                    />
                  ))
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** One or more lines sharing an x axis. */
export function LineSeriesChart<T extends object>({
  data,
  xKey,
  series,
  height = 260,
  valueFormatter,
  yWidth = 40,
  className,
}: {
  data: T[]
  xKey: string
  series: SeriesDef[]
  height?: number
  valueFormatter?: (value: number) => string
  yWidth?: number
  className?: string
}) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="hsl(var(--chart-grid))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            dy={8}
            interval="preserveStartEnd"
            tick={axisTick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={yWidth}
            tick={axisTick}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={<ThemedTooltip valueFormatter={valueFormatter} />}
            cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
          />
          {series.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={chartColor(entry.tone)}
              strokeWidth={2}
              strokeDasharray={entry.dashed ? '5 4' : undefined}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Circular score gauge (0–max) with a caption under the value. */
export function ScoreGauge({
  value,
  max = 100,
  label,
  caption,
  tone = 'primary',
  className,
}: {
  value: number | null | undefined
  max?: number
  label: string
  caption?: string
  tone?: ChartTone
  className?: string
}) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const fraction = clamp(numeric / max, 0, 1)

  return (
    <div className={cn('relative h-44 w-44 shrink-0', className)}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        role="img"
        aria-label={`${label}: ${Math.round(numeric)} out of ${max}`}
      >
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={chartColor(tone)}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${fraction * circumference} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-semibold leading-none tracking-tight tabular text-foreground">
            {Math.round(numeric)}
          </p>
          <p className="mt-1.5 text-2xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          {caption ? <p className="mt-0.5 text-2xs text-muted-foreground">{caption}</p> : null}
        </div>
      </div>
    </div>
  )
}

/** Risk level → chart tone, shared by gauges and legends. */
export function riskTone(level: string | null | undefined): ChartTone {
  switch (level) {
    case 'critical':
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'success'
    default:
      return 'primary'
  }
}
