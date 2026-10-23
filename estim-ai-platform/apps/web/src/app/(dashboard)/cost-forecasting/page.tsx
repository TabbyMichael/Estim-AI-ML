'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Field } from '@/components/ui/label'
import { Input, InputWithIcon } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { BarSeriesChart } from '@/components/charts/modules'
import { ChartLegend } from '@/components/charts/overview'
import { ConfidenceRange } from '@/components/modules/ConfidenceRange'
import { useAuth } from '@/lib/auth-context'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  forecastingApi,
  type CostForecast,
  type CostForecastList,
  type ForecastModelList,
  type ForecastStatus,
  type ForecastType,
} from '@/lib/api/forecasting'
import { DEMO_COST_FORECAST_LIST, DEMO_FORECAST_MODEL_LIST } from '@/lib/demo/forecasting'
import { DEMO_PROJECTS } from '@/lib/demo/projects'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  humanize,
} from '@/lib/utils'

const FORECAST_KEY = queryKeys.forecasting.forecasts({ scope: 'page' })
const MODEL_KEY = queryKeys.forecasting.models()

const projectName = (projectId: string) =>
  DEMO_PROJECTS.find((project) => project.id === projectId)?.title ?? projectId

const projectCode = (projectId: string) =>
  DEMO_PROJECTS.find((project) => project.id === projectId)?.code ?? projectId

const generateSchema = z
  .object({
    project_id: z.string().min(1, 'Select a project'),
    forecast_type: z.enum(['project_total', 'phase_breakdown', 'monthly_burn', 'variance_analysis']),
    predicted_amount: z.coerce.number().min(1_000, 'Enter the predicted amount'),
    confidence_low: z.coerce.number().min(0, 'Enter the lower bound'),
    confidence_high: z.coerce.number().min(0, 'Enter the upper bound'),
  })
  .refine((values) => values.confidence_low <= values.predicted_amount, {
    path: ['confidence_low'],
    message: 'Lower bound must not exceed the estimate',
  })
  .refine((values) => values.confidence_high >= values.predicted_amount, {
    path: ['confidence_high'],
    message: 'Upper bound must be at least the estimate',
  })

type GenerateValues = z.infer<typeof generateSchema>

type ChartPoint = { label: string; predicted: number; actual: number }

export default function CostForecastingPage() {
  const { user, isDemoSession } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [statusFilter, setStatusFilter] = useState<'all' | ForecastStatus>('all')
  const [search, setSearch] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [selected, setSelected] = useState<CostForecast | null>(null)

  const forecastQuery = useDemoQuery<CostForecastList>({
    queryKey: FORECAST_KEY,
    queryFn: () => forecastingApi.listForecasts({ limit: 100 }),
    demo: DEMO_COST_FORECAST_LIST,
  })

  const modelQuery = useDemoQuery<ForecastModelList>({
    queryKey: MODEL_KEY,
    queryFn: () => forecastingApi.listModels({ limit: 20 }),
    demo: DEMO_FORECAST_MODEL_LIST,
  })

  const forecasts = useMemo(() => forecastQuery.data?.forecasts ?? [], [forecastQuery.data])
  const models = useMemo(() => modelQuery.data?.models ?? [], [modelQuery.data])
  const activeModel = useMemo(() => models.find((model) => model.is_active) ?? models[0] ?? null, [models])
  const demo = isDemoSession || forecastQuery.isDemo || modelQuery.isDemo

  const form = useForm<GenerateValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      project_id: DEMO_PROJECTS[0]?.id ?? '',
      forecast_type: 'project_total',
    },
  })

  const createMutation = useDemoMutation<CostForecast, GenerateValues>({
    mutationFn: async (values) => {
      const created = await forecastingApi.createForecast({
        project_id: values.project_id,
        forecast_type: values.forecast_type,
        predicted_amount: values.predicted_amount,
        confidence_interval_low: values.confidence_low,
        confidence_interval_high: values.confidence_high,
        model_version: activeModel?.version ?? 'v2.4.1',
        created_by: user?.id ?? 'usr-admin',
      })
      if (!created.id) return created
      try {
        return await forecastingApi.generateForecast(created.id)
      } catch {
        return created
      }
    },
    demo: (values, client) => {
      const created: CostForecast = {
        id: `fc-demo-${Date.now()}`,
        project_id: values.project_id,
        forecast_type: values.forecast_type,
        status: 'generated',
        predicted_amount: values.predicted_amount,
        confidence_interval_low: values.confidence_low,
        confidence_interval_high: values.confidence_high,
        model_version: activeModel?.version ?? 'v2.4.1',
        created_at: new Date().toISOString(),
        created_by: user?.id ?? 'usr-admin',
        actual_amount: null,
        variance: null,
        accuracy_score: null,
        approved_by: null,
        approved_at: null,
        notes: null,
      }
      client.setQueryData<CostForecastList>(FORECAST_KEY, (previous) =>
        previous
          ? { ...previous, forecasts: [created, ...previous.forecasts], total: previous.total + 1 }
          : previous,
      )
      return created
    },
    onSuccess: (created) => {
      success(
        'Forecast generated',
        `${projectName(created.project_id)} · ${formatCurrency(created.predicted_amount, {
          compact: true,
          maximumFractionDigits: 1,
        })} estimate ready for review.`,
      )
      setGenerateOpen(false)
      form.reset({ project_id: DEMO_PROJECTS[0]?.id ?? '', forecast_type: 'project_total' })
      void queryClient.invalidateQueries({ queryKey: FORECAST_KEY })
    },
    onError: (mutationError) => toastError('Could not generate the forecast', mutationError.message),
  })

  const approveMutation = useDemoMutation<CostForecast, CostForecast>({
    mutationFn: (forecast) => forecastingApi.approveForecast(forecast.id, user?.id ?? 'usr-admin'),
    demo: (forecast, client) => {
      const updated: CostForecast = {
        ...forecast,
        status: 'approved',
        approved_by: user?.id ?? 'usr-admin',
        approved_at: new Date().toISOString(),
      }
      client.setQueryData<CostForecastList>(FORECAST_KEY, (previous) =>
        previous
          ? {
              ...previous,
              forecasts: previous.forecasts.map((item) => (item.id === forecast.id ? updated : item)),
            }
          : previous,
      )
      return updated
    },
    onSuccess: (updated) => {
      success('Forecast approved', `${projectName(updated.project_id)} is now baselined.`)
      setSelected(null)
      void queryClient.invalidateQueries({ queryKey: FORECAST_KEY })
    },
    onError: (mutationError) => toastError('Could not approve the forecast', mutationError.message),
  })

  const stats = useMemo(() => {
    const approved = forecasts.filter((forecast) => forecast.status === 'approved')
    const predicted = approved.reduce((sum, forecast) => sum + forecast.predicted_amount, 0)
    const actual = approved.reduce((sum, forecast) => sum + (forecast.actual_amount ?? 0), 0)
    const scored = approved.filter((forecast) => typeof forecast.accuracy_score === 'number')
    const accuracy = scored.length
      ? scored.reduce((sum, forecast) => sum + (forecast.accuracy_score ?? 0), 0) / scored.length
      : 0
    const pending = forecasts.filter((forecast) => forecast.status === 'generated').length
    const variance = approved.reduce((sum, forecast) => sum + (forecast.variance ?? 0), 0)
    return { predicted, actual, accuracy, pending, variance }
  }, [forecasts])

  const chartData = useMemo<ChartPoint[]>(() => {
    return DEMO_PROJECTS.flatMap((project) => {
      const projectForecasts = forecasts
        .filter((forecast) => forecast.project_id === project.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      const latest = projectForecasts[0]
      if (!latest) return []
      return [
        {
          label: project.title.split(' ')[0],
          predicted: Math.round((latest.predicted_amount / 1_000_000) * 10) / 10,
          actual: Math.round(((latest.actual_amount ?? 0) / 1_000_000) * 10) / 10,
        },
      ]
    })
  }, [forecasts])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return forecasts.filter((forecast) => {
      if (statusFilter !== 'all' && forecast.status !== statusFilter) return false
      if (
        term &&
        !`${projectName(forecast.project_id)} ${projectCode(forecast.project_id)} ${forecast.forecast_type}`
          .toLowerCase()
          .includes(term)
      ) {
        return false
      }
      return true
    })
  }, [forecasts, statusFilter, search])

  const columns: Column<CostForecast>[] = [
    {
      id: 'project',
      header: 'Project',
      sortValue: (row) => projectName(row.project_id),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{projectName(row.project_id)}</p>
          <p className="font-mono text-2xs text-muted-foreground">{projectCode(row.project_id)}</p>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      hideOnMobile: true,
      sortValue: (row) => row.forecast_type,
      cell: (row) => <span className="text-xs text-muted-foreground">{humanize(row.forecast_type)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'predicted',
      header: 'Predicted',
      align: 'right',
      sortValue: (row) => row.predicted_amount,
      cell: (row) => (
        <span className="whitespace-nowrap tabular text-xs font-medium text-foreground">
          {formatCurrency(row.predicted_amount, { compact: true, maximumFractionDigits: 1 })}
        </span>
      ),
    },
    {
      id: 'confidence',
      header: 'Confidence range',
      hideOnMobile: true,
      sortValue: (row) => row.confidence_interval_low,
      cell: (row) => (
        <ConfidenceRange
          low={row.confidence_interval_low}
          high={row.confidence_interval_high}
          value={row.predicted_amount}
          formatter={(value) => formatCurrency(value, { compact: true })}
        />
      ),
    },
    {
      id: 'accuracy',
      header: 'Accuracy',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.accuracy_score,
      cell: (row) => (
        <span className="tabular text-xs text-muted-foreground">
          {typeof row.accuracy_score === 'number'
            ? formatPercent(row.accuracy_score, { digits: 0 })
            : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) =>
        row.status === 'generated' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              approveMutation.mutate(row)
            }}
            disabled={approveMutation.isPending}
          >
            Approve
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation()
              setSelected(row)
            }}
          >
            View
          </Button>
        ),
    },
  ]

  const metricEntries = activeModel
    ? [
        { label: 'MAPE', value: formatPercent(activeModel.metrics.mape, { digits: 1 }) },
        {
          label: 'RMSE',
          value: formatCurrency(activeModel.metrics.rmse, { compact: true, maximumFractionDigits: 1 }),
        },
        { label: 'R²', value: (activeModel.metrics.r2 ?? 0).toFixed(2) },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI modules"
        title="Cost forecasting"
        description="Predict final project cost from historic burn, committed spend and material escalation — then baseline it against actuals."
        demo={demo}
        actions={
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Sparkles />
            Generate forecast
          </Button>
        }
      />

      <section aria-label="Forecast indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Approved forecast"
          value={formatCurrency(stats.predicted, { compact: true, maximumFractionDigits: 1 })}
          icon={CircleDollarSign}
          tone="primary"
          hint={`${forecasts.filter((forecast) => forecast.status === 'approved').length} baselined forecasts`}
          loading={forecastQuery.isLoading}
        />
        <StatCard
          label="Actual to date"
          value={formatCurrency(stats.actual, { compact: true, maximumFractionDigits: 1 })}
          icon={TrendingUp}
          tone="success"
          hint={`Variance ${formatCurrency(stats.variance, { compact: true, signDisplay: 'always' })}`}
          loading={forecastQuery.isLoading}
        />
        <StatCard
          label="Model accuracy"
          value={formatPercent(stats.accuracy, { digits: 1 })}
          icon={Target}
          tone="info"
          hint="Mean accuracy of approved runs"
          loading={forecastQuery.isLoading}
        />
        <StatCard
          label="Awaiting approval"
          value={stats.pending}
          icon={Activity}
          tone="warning"
          hint="Generated runs in the queue"
          loading={forecastQuery.isLoading}
        />
      </section>

      <section aria-label="Forecast analytics" className="grid gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardToolbar
            title="Forecast vs actual"
            description="Latest forecast per project against recorded spend, USD millions."
            actions={
              <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                Portfolio
              </span>
            }
          />
          <CardContent className="pb-2">
            <BarSeriesChart
              data={chartData}
              xKey="label"
              height={264}
              valueFormatter={(value) => `$${value}M`}
              yWidth={48}
              series={[
                { key: 'predicted', label: 'Forecast', tone: 'primary' },
                { key: 'actual', label: 'Actual', tone: 'violet' },
              ]}
            />
          </CardContent>
          <CardFooter className="mt-auto">
            <ChartLegend
              items={[
                { label: 'Forecast', tone: 'primary' },
                { label: 'Actual to date', tone: 'violet' },
              ]}
            />
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Active model"
            description="The model behind generated forecasts."
            actions={activeModel ? <Badge tone="success" dot>Active</Badge> : null}
          />
          <CardContent className="flex-1 space-y-4">
            {modelQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading model…</p>
            ) : activeModel ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary-muted text-primary">
                    <BrainCircuit className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{activeModel.name}</p>
                    <p className="text-2xs text-muted-foreground">
                      {activeModel.version} · {humanize(activeModel.model_type)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {metricEntries.map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-border bg-muted/30 p-2">
                      <p className="text-2xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                      <p className="mt-0.5 tabular text-xs font-semibold text-foreground">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-2xs leading-relaxed text-muted-foreground">
                  Trained {formatDate(activeModel.training_period_start)} –{' '}
                  {formatDate(activeModel.training_period_end)}.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No forecast model is registered.</p>
            )}
          </CardContent>
          <CardFooter>
            <span className="text-2xs text-muted-foreground">
              {models.length} model version{models.length === 1 ? '' : 's'} registered
            </span>
          </CardFooter>
        </Card>
      </section>

      <section aria-label="Forecast register" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Forecast register</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {forecasts.length} forecasts shown.
            </p>
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          loading={forecastQuery.isLoading}
          error={forecastQuery.isError ? forecastQuery.error?.message ?? 'Could not load forecasts.' : null}
          onRetry={() => void forecastQuery.refetch()}
          onRowClick={setSelected}
          pageSize={8}
          emptyTitle="No forecasts match these filters"
          emptyDescription="Generate a forecast or clear the current filters."
          emptyAction={
            <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
              Generate forecast
            </Button>
          }
          toolbar={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <InputWithIcon
                icon={<Search />}
                placeholder="Search project or type…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:max-w-xs"
                aria-label="Search forecasts"
              />
              <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | ForecastStatus)}
                  aria-label="Filter by status"
                  className="w-full sm:w-44"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="generated">Generated</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="superseded">Superseded</option>
                </Select>
                {statusFilter !== 'all' || search ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStatusFilter('all')
                      setSearch('')
                    }}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>
          }
        />
      </section>

      {/* Generate forecast modal */}
      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate cost forecast"
        description="Record a model run with its point estimate and confidence interval."
        size="lg"
        closeOnOverlayClick={!createMutation.isPending}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setGenerateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" form="generate-forecast-form" loading={createMutation.isPending}>
              Generate
            </Button>
          </>
        }
      >
        <form
          id="generate-forecast-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project" htmlFor="project_id" required error={form.formState.errors.project_id?.message}>
              <Select
                id="project_id"
                {...form.register('project_id')}
                aria-invalid={Boolean(form.formState.errors.project_id)}
              >
                {DEMO_PROJECTS.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Forecast type"
              htmlFor="forecast_type"
              required
              error={form.formState.errors.forecast_type?.message}
            >
              <Select
                id="forecast_type"
                {...form.register('forecast_type')}
                aria-invalid={Boolean(form.formState.errors.forecast_type)}
              >
                {(['project_total', 'phase_breakdown', 'monthly_burn', 'variance_analysis'] as ForecastType[]).map(
                  (type) => (
                    <option key={type} value={type}>
                      {humanize(type)}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          <Field
            label="Predicted amount (USD)"
            htmlFor="predicted_amount"
            required
            error={form.formState.errors.predicted_amount?.message}
          >
            <Input
              id="predicted_amount"
              type="number"
              min={0}
              step="1000"
              placeholder="151800000"
              {...form.register('predicted_amount')}
              aria-invalid={Boolean(form.formState.errors.predicted_amount)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Confidence low (USD)"
              htmlFor="confidence_low"
              required
              error={form.formState.errors.confidence_low?.message}
            >
              <Input
                id="confidence_low"
                type="number"
                min={0}
                step="1000"
                placeholder="146200000"
                {...form.register('confidence_low')}
                aria-invalid={Boolean(form.formState.errors.confidence_low)}
              />
            </Field>
            <Field
              label="Confidence high (USD)"
              htmlFor="confidence_high"
              required
              error={form.formState.errors.confidence_high?.message}
            >
              <Input
                id="confidence_high"
                type="number"
                min={0}
                step="1000"
                placeholder="157400000"
                {...form.register('confidence_high')}
                aria-invalid={Boolean(form.formState.errors.confidence_high)}
              />
            </Field>
          </div>

          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
            Runs use <span className="font-medium text-foreground">{activeModel?.name ?? 'the active model'}</span>{' '}
            {activeModel ? `(${activeModel.version})` : ''}. The interval should bracket the estimate; both
            bounds are stored with the run.
          </p>
        </form>
      </Modal>

      {/* Forecast detail modal */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? projectName(selected.project_id) : 'Forecast detail'}
        description={selected ? `${humanize(selected.forecast_type)} · ${selected.model_version}` : undefined}
        footer={
          <>
            {selected?.status === 'generated' ? (
              <Button
                onClick={() => selected && approveMutation.mutate(selected)}
                loading={approveMutation.isPending}
              >
                <CheckCircle2 />
                Approve forecast
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <Badge tone="neutral">{humanize(selected.forecast_type)}</Badge>
              <Badge tone="outline">{selected.model_version}</Badge>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Predicted</dt>
                <dd className="mt-0.5 tabular text-sm font-semibold text-foreground">
                  {formatCurrency(selected.predicted_amount, { compact: true, maximumFractionDigits: 1 })}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Actual to date</dt>
                <dd className="mt-0.5 tabular text-sm text-foreground">
                  {selected.actual_amount === null || selected.actual_amount === undefined
                    ? '—'
                    : formatCurrency(selected.actual_amount, { compact: true, maximumFractionDigits: 1 })}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Confidence range</dt>
                <dd className="mt-1">
                  <ConfidenceRange
                    low={selected.confidence_interval_low}
                    high={selected.confidence_interval_high}
                    value={selected.predicted_amount}
                    formatter={(value) => formatCurrency(value, { compact: true })}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Accuracy</dt>
                <dd className="mt-0.5 tabular text-foreground">
                  {typeof selected.accuracy_score === 'number'
                    ? formatPercent(selected.accuracy_score, { digits: 1 })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Created</dt>
                <dd className="mt-0.5 text-foreground">{formatDateTime(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Created by</dt>
                <dd className="mt-0.5 text-foreground">{selected.created_by}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Approved by</dt>
                <dd className="mt-0.5 text-foreground">{selected.approved_by ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Variance</dt>
                <dd className="mt-0.5 tabular text-foreground">
                  {selected.variance === null || selected.variance === undefined
                    ? '—'
                    : formatCurrency(selected.variance, {
                        compact: true,
                        signDisplay: 'always',
                        maximumFractionDigits: 1,
                      })}
                </dd>
              </div>
            </dl>

            {selected.notes ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                {selected.notes}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
