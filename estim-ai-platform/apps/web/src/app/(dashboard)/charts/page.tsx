'use client'

import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  CalendarRange,
  Download,
  Flag,
  Gauge,
  PiggyBank,
  Receipt,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { useChartExport } from '@/components/charts'
import { BarSeriesChart, LineSeriesChart, ScoreGauge, riskTone } from '@/components/charts/modules'
import type { SeriesDef } from '@/components/charts/modules'
import { ChartLegend } from '@/components/charts/overview'
import type { ChartTone } from '@/components/charts/overview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatCard } from '@/components/ui/stat-card'
import type { StatTone } from '@/components/ui/stat-card'
import {
  DEMO_PROJECTS,
  DEMO_RISK_PREDICTIONS,
  DEMO_SPEND_SERIES,
} from '@/lib/demo/projects'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

type DatasetId = 'spend' | 'budget' | 'risk'

type GalleryDatum = { label: string; [key: string]: string | number | null }

type GalleryKpi = {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone: StatTone
}

type GalleryDataset = {
  id: DatasetId
  label: string
  title: string
  subtitle: string
  kind: 'line' | 'bar'
  stacked?: boolean
  xLabel: string
  rows: GalleryDatum[]
  series: SeriesDef[]
  legend: { label: string; tone: ChartTone; dashed?: boolean }[]
  valueFormatter: (value: number) => string
  gauge: { value: number; label: string; caption: string; tone: ChartTone }
  kpis: GalleryKpi[]
}

const currencyMillions = (value: number) =>
  formatCurrency(value * 1_000_000, { compact: true, maximumFractionDigits: 1 })

const RISK_SERIES: SeriesDef[] = [
  { key: 'low', label: 'Low', tone: 'success' },
  { key: 'medium', label: 'Medium', tone: 'warning' },
  { key: 'high', label: 'High', tone: 'danger' },
  { key: 'critical', label: 'Critical', tone: 'violet' },
]

function riskLevelForScore(score: number): string {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function buildDatasets(): GalleryDataset[] {
  const reportedSpend = DEMO_SPEND_SERIES.filter((row) => row.actual !== null)
  const actualTotal = reportedSpend.reduce((sum, row) => sum + (row.actual ?? 0), 0)
  const forecastTotal = reportedSpend.reduce((sum, row) => sum + row.forecast, 0)
  const variance = actualTotal - forecastTotal
  const accuracy = forecastTotal > 0 ? 1 - Math.abs(variance) / forecastTotal : 0

  const budgetTotal = DEMO_PROJECTS.reduce((sum, project) => sum + project.budget, 0)
  const spentTotal = DEMO_PROJECTS.reduce((sum, project) => sum + project.spent, 0)
  const utilisation = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0

  const riskRows: GalleryDatum[] = DEMO_PROJECTS.map((project) => {
    const predictions = DEMO_RISK_PREDICTIONS[project.id] ?? []
    const counts: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }
    predictions.forEach((prediction) => {
      counts[prediction.risk_level] += 1
    })
    return { label: project.code, ...counts }
  })
  const meanRisk =
    DEMO_PROJECTS.reduce((sum, project) => sum + project.risk_score, 0) /
    Math.max(1, DEMO_PROJECTS.length)
  const elevated = riskRows.reduce(
    (sum, row) => sum + Number(row.high ?? 0) + Number(row.critical ?? 0),
    0,
  )
  const forecastDelayDays = Object.values(DEMO_RISK_PREDICTIONS)
    .flat()
    .reduce((sum, prediction) => sum + prediction.predicted_delay_days, 0)

  return [
    {
      id: 'spend',
      label: 'Spend',
      title: 'Actual vs forecast spend',
      subtitle: 'Monthly portfolio spend in USD millions, reported periods only feed the gauge.',
      kind: 'line',
      xLabel: 'Period',
      rows: DEMO_SPEND_SERIES.map((row) => ({
        label: row.period,
        actual: row.actual,
        forecast: row.forecast,
      })),
      series: [
        { key: 'actual', label: 'Actual', tone: 'success' },
        { key: 'forecast', label: 'Forecast', tone: 'violet', dashed: true },
      ],
      legend: [
        { label: 'Actual', tone: 'success' },
        { label: 'Forecast', tone: 'violet', dashed: true },
      ],
      valueFormatter: currencyMillions,
      gauge: {
        value: Math.round(accuracy * 100),
        label: 'Accuracy',
        caption: 'Reported months',
        tone: accuracy >= 0.9 ? 'success' : accuracy >= 0.75 ? 'warning' : 'danger',
      },
      kpis: [
        {
          label: 'Reported actual',
          value: currencyMillions(actualTotal),
          hint: `${reportedSpend.length} of ${DEMO_SPEND_SERIES.length} periods`,
          icon: Activity,
          tone: 'primary',
        },
        {
          label: 'Forecast',
          value: currencyMillions(forecastTotal),
          hint: 'Same-period model output',
          icon: CalendarRange,
          tone: 'info',
        },
        {
          label: 'Variance',
          value: currencyMillions(variance),
          hint: 'Actual minus forecast',
          icon: variance > 0 ? TrendingDown : Activity,
          tone: variance > 0 ? 'danger' : 'success',
        },
      ],
    },
    {
      id: 'budget',
      label: 'Budget',
      title: 'Budget vs committed spend',
      subtitle: 'Approved budget and committed spend per project in USD millions.',
      kind: 'bar',
      xLabel: 'Project',
      rows: DEMO_PROJECTS.map((project) => ({
        label: project.code,
        budget: project.budget / 1_000_000,
        spent: project.spent / 1_000_000,
      })),
      series: [
        { key: 'budget', label: 'Budget', tone: 'primary' },
        { key: 'spent', label: 'Spent', tone: 'success' },
      ],
      legend: [
        { label: 'Budget', tone: 'primary' },
        { label: 'Spent', tone: 'success' },
      ],
      valueFormatter: currencyMillions,
      gauge: {
        value: Math.round(utilisation),
        label: 'Utilised',
        caption: 'Portfolio budget',
        tone: utilisation > 95 ? 'danger' : utilisation > 85 ? 'warning' : 'success',
      },
      kpis: [
        {
          label: 'Total budget',
          value: currencyMillions(budgetTotal / 1_000_000),
          hint: `${DEMO_PROJECTS.length} active projects`,
          icon: Wallet,
          tone: 'primary',
        },
        {
          label: 'Committed spend',
          value: currencyMillions(spentTotal / 1_000_000),
          hint: `${formatPercent(utilisation / 100)} of budget`,
          icon: Receipt,
          tone: 'success',
        },
        {
          label: 'Remaining',
          value: currencyMillions((budgetTotal - spentTotal) / 1_000_000),
          hint: 'Budget less committed spend',
          icon: PiggyBank,
          tone: 'info',
        },
      ],
    },
    {
      id: 'risk',
      label: 'Risk mix',
      title: 'Risk predictions by severity',
      subtitle: 'Prediction volume per project, grouped by model severity.',
      kind: 'bar',
      stacked: true,
      xLabel: 'Project',
      rows: riskRows,
      series: RISK_SERIES,
      legend: RISK_SERIES.map((series) => ({ label: series.label, tone: series.tone })),
      valueFormatter: (value) => `${formatNumber(value)}`,
      gauge: {
        value: Math.round(meanRisk),
        label: 'Risk score',
        caption: 'Portfolio mean',
        tone: riskTone(riskLevelForScore(meanRisk)),
      },
      kpis: [
        {
          label: 'Mean risk score',
          value: `${Math.round(meanRisk)}`,
          hint: 'Across active projects',
          icon: Gauge,
          tone: meanRisk >= 50 ? 'warning' : 'success',
        },
        {
          label: 'Elevated predictions',
          value: `${elevated}`,
          hint: 'High or critical severity',
          icon: ShieldAlert,
          tone: elevated > 0 ? 'danger' : 'success',
        },
        {
          label: 'Forecast delay',
          value: `${formatNumber(forecastDelayDays)} days`,
          hint: 'Sum of predicted slippage',
          icon: Flag,
          tone: 'info',
        },
      ],
    },
  ]
}

export default function ChartsGalleryPage() {
  const [datasetId, setDatasetId] = useState<DatasetId>('spend')
  const datasets = useMemo(() => buildDatasets(), [])
  const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0]
  const { ref: chartRef, exportPng } = useChartExport()

  const columns = useMemo<Column<GalleryDatum>[]>(() => {
    const seriesColumns: Column<GalleryDatum>[] = dataset.series.map((series) => ({
      id: series.key,
      header: series.label,
      align: 'right',
      cell: (row) => {
        const value = row[series.key]
        if (typeof value !== 'number') {
          return <span className="text-muted-foreground">—</span>
        }
        return <span className="tabular">{dataset.valueFormatter(value)}</span>
      },
    }))
    return [
      {
        id: 'label',
        header: dataset.xLabel,
        cell: (row) => <span className="font-medium text-foreground">{row.label}</span>,
      },
      ...seriesColumns,
    ]
  }, [dataset])

  const ChartComponent = dataset.kind === 'line' ? 'line' : 'bar'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Chart gallery"
        description="Every reusable visualisation rendered from the same themed chart primitives. Switch the dataset, inspect the series table and export the SVG."
        demo
        actions={
          <SegmentedControl<DatasetId>
            options={datasets.map((item) => ({ value: item.id, label: item.label }))}
            value={dataset.id}
            onValueChange={setDatasetId}
            aria-label="Chart dataset"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dataset.kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardToolbar
            title={dataset.title}
            description={dataset.subtitle}
            actions={
              <>
                <ChartLegend items={dataset.legend} className="hidden md:flex" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPng(`${dataset.id}-chart.svg`)}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export SVG
                </Button>
              </>
            }
          />
          <CardContent>
            <div ref={chartRef} className="w-full">
              {ChartComponent === 'line' ? (
                <LineSeriesChart
                  data={dataset.rows}
                  xKey="label"
                  series={dataset.series}
                  height={320}
                  valueFormatter={dataset.valueFormatter}
                  yWidth={56}
                />
              ) : (
                <BarSeriesChart
                  data={dataset.rows}
                  xKey="label"
                  series={dataset.series}
                  stacked={dataset.stacked}
                  height={320}
                  valueFormatter={dataset.valueFormatter}
                  yWidth={48}
                />
              )}
            </div>
            <ChartLegend items={dataset.legend} className="mt-4 md:hidden" />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardToolbar
              title="Headline metric"
              description="Derived from the rows currently displayed."
            />
            <CardContent className="flex justify-center">
              <ScoreGauge
                value={dataset.gauge.value}
                label={dataset.gauge.label}
                caption={dataset.gauge.caption}
                tone={dataset.gauge.tone}
              />
            </CardContent>
          </Card>

          <Card>
            <CardToolbar title="Dataset notes" description="What feeds this gallery view." />
            <CardContent>
              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Dataset</dt>
                  <dd className="font-medium text-foreground">{dataset.label}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Points</dt>
                  <dd className="tabular font-medium text-foreground">{dataset.rows.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Series</dt>
                  <dd className="tabular font-medium text-foreground">{dataset.series.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Chart type</dt>
                  <dd className="font-medium capitalize text-foreground">
                    {dataset.stacked ? 'Stacked bar' : dataset.kind}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="font-medium text-foreground">Demo fixtures</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-2xs leading-relaxed text-muted-foreground">
                Charts inherit theme tokens, so tone, grid and tooltip colours follow the active
                light or dark palette. Export writes the rendered SVG to a file.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <DataTable
        data={dataset.rows}
        columns={columns}
        getRowId={(row) => row.label}
        pageSize={8}
        caption={`${dataset.label} series data`}
        emptyTitle="No series data"
        emptyDescription="This dataset does not expose any rows."
        toolbar={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            {dataset.rows.length} rows · {dataset.series.length} series
          </div>
        }
      />
    </div>
  )
}
