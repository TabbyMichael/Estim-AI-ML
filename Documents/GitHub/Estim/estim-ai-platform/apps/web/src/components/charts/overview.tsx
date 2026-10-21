'use client'

/**
 * Themed overview charts used by the dashboard (and reused by module pages).
 * Colours come from the design-token chart palette so both themes stay in sync.
 */

import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

export type ChartTone = 'primary' | 'violet' | 'info' | 'success' | 'warning' | 'danger'

/** Chart tone → CSS custom property holding HSL channels. */
export const CHART_TONE_VAR: Record<ChartTone, string> = {
  primary: '--primary',
  violet: '--chart-2',
  info: '--info',
  success: '--success',
  warning: '--warning',
  danger: '--destructive',
}

export function chartColor(tone: ChartTone, alpha = 1): string {
  return `hsl(var(${CHART_TONE_VAR[tone]}) / ${alpha})`
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values,
  tone = 'primary',
  className,
}: {
  values: number[]
  tone?: ChartTone
  className?: string
}) {
  const gradientId = `spark-${useId().replace(/[:]/g, '')}`
  const series = values.length >= 2 ? values : [0, 0]
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1
  const points = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100
      const y = 28 - ((value - min) / range) * 24
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const color = chartColor(tone)

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={cn('h-10 w-full', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${points} 100,32`} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Spend vs forecast                                                   */
/* ------------------------------------------------------------------ */

export type SpendPoint = {
  period: string
  actual: number | null
  forecast: number
}

type TooltipEntry = {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
}

function SpendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => {
        if (entry.value === null || entry.value === undefined) return null
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
            <span className="ml-auto pl-3 font-medium tabular text-foreground">
              ${entry.value}M
            </span>
          </p>
        )
      })}
    </div>
  )
}

export function SpendForecastChart({
  data,
  height = 288,
}: {
  data: SpendPoint[]
  height?: number
}) {
  const id = `spend-${useId().replace(/[:]/g, '')}`

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={`${id}-actual`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor('primary')} stopOpacity={0.28} />
              <stop offset="100%" stopColor={chartColor('primary')} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${id}-forecast`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor('violet')} stopOpacity={0.16} />
              <stop offset="100%" stopColor={chartColor('violet')} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="hsl(var(--chart-grid))"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            dy={8}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(value: number) => `$${value}M`}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <Tooltip
            content={<SpendTooltip />}
            cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke={chartColor('violet')}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill={`url(#${id}-forecast)`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={chartColor('primary')}
            strokeWidth={2}
            fill={`url(#${id}-actual)`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; tone: ChartTone; dashed?: boolean }[]
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-muted-foreground', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn('h-0.5 w-4 rounded-full', item.dashed && 'opacity-70')}
            style={{
              backgroundColor: chartColor(item.tone),
              backgroundImage: item.dashed
                ? `repeating-linear-gradient(90deg, ${chartColor(item.tone)} 0 4px, transparent 4px 7px)`
                : undefined,
            }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Health ring                                                         */
/* ------------------------------------------------------------------ */

export type RingSegment = {
  label: string
  value: number
  tone: ChartTone
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 5

export function HealthRing({
  segments,
  label,
  value,
  className,
}: {
  segments: RingSegment[]
  label: string
  value: React.ReactNode
  className?: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  let offset = 0

  return (
    <div className={cn('relative h-36 w-36 shrink-0', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={label}>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        {segments.map((segment) => {
          const fraction = segment.value / total
          const length = Math.max(fraction * CIRCUMFERENCE - GAP, 0.5)
          const circle = (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={chartColor(segment.tone)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
            />
          )
          offset += fraction * CIRCUMFERENCE
          return circle
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-semibold leading-none tracking-tight tabular text-foreground">
            {value}
          </p>
          <p className="mt-1 text-2xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}
