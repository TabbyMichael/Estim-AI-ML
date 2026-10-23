'use client'

import { useMemo, useState } from 'react'
import { Activity, CalendarRange, Target, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { LineSeriesChart } from '@/components/charts/modules'
import { ChartLegend } from '@/components/charts/overview'
import { DEMO_SPEND_SERIES } from '@/lib/demo/projects'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

type Format = 'currency' | 'number'

type SeriesRow = (typeof DEMO_SPEND_SERIES)[number]

type TableRow = SeriesRow & {
  delta: number | null
  deltaRatio: number | null
}

function formatValue(value: number | null | undefined, format: Format): string {
  if (value === null || value === undefined) return '—'
  return format === 'currency'
    ? formatCurrency(value * 1_000_000, { compact: true, maximumFractionDigits: 1 })
    : `${formatNumber(value, 1)}M`
}

export default function TimeSeriesPage() {
  const [format, setFormat] = useState<Format>('currency')
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(DEMO_SPEND_SERIES.length - 1)

  const ranged = useMemo(() => DEMO_SPEND_SERIES.slice(start, end + 1), [start, end])

  const rows = useMemo<TableRow[]>(
    () =>
      ranged.map((row) => {
        const delta = row.actual === null ? null : row.actual - row.forecast
        return {
          ...row,
          delta,
          deltaRatio: delta === null || row.forecast === 0 ? null : delta / row.forecast,
        }
      }),
    [ranged],
  )

  const totals = useMemo(() => {
    const actual = ranged.reduce((sum, row) => sum + (row.actual ?? 0), 0)
    const forecast = ranged.reduce((sum, row) => sum + row.forecast, 0)
    const variance = actual - forecast
    const accuracy = forecast === 0 ? null : 1 - Math.abs(variance) / forecast
    return { actual, forecast, variance, accuracy }
  }, [ranged])

  const changed = (nextStart: number, nextEnd: number) => {
    if (nextStart > nextEnd) {
      setStart(nextStart)
      setEnd(nextStart)
      return
    }
    setStart(nextStart)
    setEnd(nextEnd)
  }

  const columns: Column<TableRow>[] = [
    {
      id: 'period',
      header: 'Period',
      cell: (row) => <span className="text-xs font-medium text-foreground">{row.period}</span>,
      sortValue: (row) => row.period,
    },
    {
      id: 'actual',
      header: 'Actual',
      align: 'right',
      cell: (row) => (
        <span className="tabular text-xs">
          {formatValue(row.actual, format)}
        </span>
      ),
      sortValue: (row) => row.actual,
    },
    {
      id: 'forecast',
      header: 'Forecast',
      align: 'right',
      cell: (row) => (
        <span className="tabular text-xs text-muted-foreground">
          {formatValue(row.forecast, format)}
        </span>
      ),
      sortValue: (row) => row.forecast,
    },
    {
      id: 'delta',
      header: 'Δ vs forecast',
      align: 'right',
      cell: (row) =>
        row.delta === null ? (
          <span className="text-2xs text-muted-foreground">pending</span>
        ) : (
          <span
            className={cn(
              'tabular text-xs font-medium',
              row.delta > 0 ? 'text-destructive' : 'text-success',
            )}
          >
            {formatValue(row.delta, format)}
          </span>
        ),
      sortValue: (row) => row.delta,
    },
    {
      id: 'deltaPct',
      header: 'Δ %',
      align: 'right',
      hideOnMobile: true,
      cell: (row) =>
        row.deltaRatio === null ? (
          <span className="text-2xs text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              'tabular text-xs',
              row.deltaRatio > 0 ? 'text-destructive' : 'text-success',
            )}
          >
            {formatPercent(row.deltaRatio)}
          </span>
        ),
      sortValue: (row) => row.deltaRatio,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Intelligence"
        title="Time-series analysis"
        description="Explore the portfolio spend series across periods, compare actuals with the forecast and measure variance."
        demo
        actions={
          <SegmentedControl<Format>
            value={format}
            onValueChange={setFormat}
            aria-label="Value format"
            options={[
              { value: 'currency', label: 'Currency' },
              { value: 'number', label: 'Millions' },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Actual spend"
          value={formatValue(totals.actual, format)}
          icon={TrendingUp}
          hint={`${ranged.filter((row) => row.actual !== null).length} reported periods`}
        />
        <StatCard
          label="Forecast spend"
          value={formatValue(totals.forecast, format)}
          icon={Activity}
          tone="info"
          hint="Model forecast for the same range"
        />
        <StatCard
          label="Variance"
          value={formatValue(totals.variance, format)}
          icon={CalendarRange}
          tone={totals.variance > 0 ? 'danger' : 'success'}
          hint={totals.variance > 0 ? 'Actuals above forecast' : 'Actuals at or below forecast'}
        />
        <StatCard
          label="Forecast accuracy"
          value={totals.accuracy === null ? '—' : formatPercent(totals.accuracy)}
          icon={Target}
          tone={
            totals.accuracy === null
              ? 'neutral'
              : totals.accuracy > 0.95
                ? 'success'
                : totals.accuracy > 0.85
                  ? 'warning'
                  : 'danger'
          }
          hint="1 − |variance| / forecast"
        />
      </div>

      <Card>
        <CardToolbar
          title="Actual vs forecast"
          description="Monthly spend in USD millions."
          actions={
            <ChartLegend
              items={[
                { label: 'Actual', tone: 'success' },
                { label: 'Forecast', tone: 'violet', dashed: true },
              ]}
            />
          }
        />
        <CardContent>
          <LineSeriesChart
            data={ranged}
            xKey="period"
            series={[
              { key: 'actual', label: 'Actual', tone: 'success' },
              { key: 'forecast', label: 'Forecast', tone: 'violet', dashed: true },
            ]}
            valueFormatter={(value) => formatValue(value, format)}
            height={300}
          />

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                From
              </span>
              <Select
                value={String(start)}
                onChange={(event) => changed(Number(event.target.value), end)}
                className="w-32"
              >
                {DEMO_SPEND_SERIES.map((row, index) => (
                  <option key={row.period} value={index}>
                    {row.period}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                To
              </span>
              <Select
                value={String(end)}
                onChange={(event) => changed(start, Number(event.target.value))}
                className="w-32"
              >
                {DEMO_SPEND_SERIES.map((row, index) => (
                  <option key={row.period} value={index} disabled={index < start}>
                    {row.period}
                  </option>
                ))}
              </Select>
            </label>
            <Badge tone="neutral" className="ml-auto">
              {ranged.length} periods · {formatValue(totals.variance, format)} variance
            </Badge>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.period}
        emptyTitle="No periods in range"
        emptyDescription="Widen the range to see more periods."
        dense
      />
    </div>
  )
}
