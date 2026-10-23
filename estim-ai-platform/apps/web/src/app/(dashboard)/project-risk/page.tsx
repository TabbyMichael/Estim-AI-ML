'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Activity, AlertTriangle, Clock, Flag, Gauge } from 'lucide-react'

import { Badge, RiskBadge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Progress, ProgressRow } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, type StatTone } from '@/components/ui/stat-card'
import { ScoreGauge } from '@/components/charts/modules'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  riskApi,
  type Milestone,
  type MilestoneStatus,
  type ProjectHealth,
  type ProjectRiskLevel,
  type RiskPrediction,
} from '@/lib/api/risk'
import {
  DEMO_PROJECTS,
  DEMO_RISK_PREDICTIONS,
  demoMilestones,
  demoProject,
  demoProjectHealth,
  type DemoProject,
} from '@/lib/demo/projects'
import { formatCurrency, formatDate, formatPercent, formatRelative, humanize } from '@/lib/utils'

const RISK_ORDER: ProjectRiskLevel[] = ['critical', 'high', 'medium', 'low']

function isoDate(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function probabilityRisk(probability: number): ProjectRiskLevel {
  if (probability >= 0.7) return 'critical'
  if (probability >= 0.5) return 'high'
  if (probability >= 0.3) return 'medium'
  return 'low'
}

function healthTone(level: string | null | undefined): StatTone {
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

function riskProgressTone(level: string | null | undefined): 'success' | 'warning' | 'danger' | 'primary' {
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

function milestoneTone(status: MilestoneStatus): 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'completed') return 'success'
  if (status === 'delayed') return 'danger'
  if (status === 'in_progress') return 'primary'
  return 'warning'
}

const trackSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Name the milestone')
      .max(80, 'Keep the name under 80 characters'),
    planned_start: z.string().min(1, 'Pick a start date'),
    planned_end: z.string().min(1, 'Pick an end date'),
    status: z.enum(['not_started', 'in_progress', 'completed']),
  })
  .refine(
    (values) => !values.planned_start || !values.planned_end || values.planned_end >= values.planned_start,
    { path: ['planned_end'], message: 'End date must be on or after the start date' },
  )

const predictSchema = z.object({
  milestone_id: z.string().min(1, 'Select a milestone'),
  delay_probability: z.coerce.number().min(1, 'Enter at least 1%').max(99, 'Enter 99% or less'),
  predicted_delay_days: z.coerce
    .number()
    .int()
    .min(1, 'Use at least 1 day')
    .max(365, 'Use 365 days or fewer'),
})

type TrackValues = z.infer<typeof trackSchema>
type PredictValues = z.infer<typeof predictSchema>

type PredictionList = { predictions: RiskPrediction[]; total: number }

export default function ProjectRiskPage() {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [projectId, setProjectId] = useState(DEMO_PROJECTS[0]?.id ?? 'prj-1001')
  const [trackOpen, setTrackOpen] = useState(false)
  const [predictOpen, setPredictOpen] = useState(false)

  const project: DemoProject = useMemo(() => demoProject(projectId), [projectId])

  const milestoneKey = queryKeys.risk.milestones(projectId)
  const predictionKey = queryKeys.risk.predictions(projectId)

  const milestonesQuery = useDemoQuery<Milestone[]>({
    queryKey: milestoneKey,
    queryFn: () => riskApi.listMilestones(projectId),
    demo: demoMilestones(projectId),
  })

  const healthQuery = useDemoQuery<ProjectHealth>({
    queryKey: queryKeys.risk.health(projectId),
    queryFn: () => riskApi.projectHealth(projectId),
    demo: demoProjectHealth(projectId),
  })

  const predictionsQuery = useDemoQuery<PredictionList>({
    queryKey: predictionKey,
    queryFn: async () => {
      const response = await riskApi.listPredictions(projectId, { limit: 50 })
      return { predictions: response.predictions, total: response.total }
    },
    demo: {
      predictions: DEMO_RISK_PREDICTIONS[projectId] ?? [],
      total: (DEMO_RISK_PREDICTIONS[projectId] ?? []).length,
    },
  })

  const milestones = useMemo(() => milestonesQuery.data ?? [], [milestonesQuery.data])
  const health = healthQuery.data
  const predictions = useMemo(
    () => predictionsQuery.data?.predictions ?? [],
    [predictionsQuery.data],
  )

  const milestoneById = useMemo(
    () => new Map(milestones.map((milestone) => [milestone.id, milestone])),
    [milestones],
  )

  const grouped = useMemo(
    () =>
      RISK_ORDER.map((level) => ({
        level,
        items: [...predictions]
          .filter((prediction) => prediction.risk_level === level)
          .sort((a, b) => b.delay_probability - a.delay_probability),
      })).filter((group) => group.items.length > 0),
    [predictions],
  )

  const topPrediction = useMemo(
    () =>
      [...predictions].sort(
        (a, b) =>
          b.predicted_delay_days - a.predicted_delay_days || b.delay_probability - a.delay_probability,
      )[0] ?? null,
    [predictions],
  )

  const forecast = useMemo(() => {
    if (predictions.length === 0) return { maxDelay: null, averageProbability: null }
    const maxDelay = Math.max(...predictions.map((prediction) => prediction.predicted_delay_days))
    const averageProbability =
      predictions.reduce((sum, prediction) => sum + prediction.delay_probability, 0) /
      predictions.length
    return { maxDelay, averageProbability }
  }, [predictions])

  const trackForm = useForm<TrackValues>({
    resolver: zodResolver(trackSchema),
    defaultValues: {
      name: '',
      planned_start: isoDate(),
      planned_end: isoDate(30),
      status: 'not_started',
    },
  })

  const predictForm = useForm<PredictValues>({
    resolver: zodResolver(predictSchema),
    defaultValues: { milestone_id: '', delay_probability: 35, predicted_delay_days: 14 },
  })

  const openTrack = () => {
    trackForm.reset({
      name: '',
      planned_start: isoDate(),
      planned_end: isoDate(30),
      status: 'not_started',
    })
    setTrackOpen(true)
  }

  const openPredict = () => {
    predictForm.reset({
      milestone_id: milestones[0]?.id ?? '',
      delay_probability: 35,
      predicted_delay_days: 14,
    })
    setPredictOpen(true)
  }

  const trackMutation = useDemoMutation<Milestone, TrackValues>({
    mutationFn: (values) =>
      riskApi.trackMilestone({
        project_id: projectId,
        name: values.name,
        planned_start: values.planned_start,
        planned_end: values.planned_end,
        status: values.status,
      }),
    demo: (values, client) => {
      const created: Milestone = {
        id: `${projectId}-ms-${Date.now()}`,
        project_id: projectId,
        name: values.name,
        planned_start: values.planned_start,
        planned_end: values.planned_end,
        status: values.status,
        progress_pct: values.status === 'completed' ? 100 : 0,
      }
      client.setQueryData<Milestone[]>(milestoneKey, (current) => [...(current ?? []), created])
      return created
    },
    onSuccess: (created) => {
      success('Milestone tracked', `${created.name} was added to ${project.title}.`)
      setTrackOpen(false)
      trackForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.risk.all() })
    },
    onError: (mutationError) => toastError('Could not track milestone', mutationError.message),
  })

  const predictMutation = useDemoMutation<RiskPrediction, PredictValues>({
    mutationFn: (values) =>
      riskApi.recordPrediction(projectId, {
        milestone_id: values.milestone_id,
        delay_probability: values.delay_probability / 100,
        predicted_delay_days: values.predicted_delay_days,
      }),
    demo: (values, client) => {
      const created: RiskPrediction = {
        id: `${projectId}-pred-${Date.now()}`,
        project_id: projectId,
        milestone_id: values.milestone_id,
        delay_probability: values.delay_probability / 100,
        predicted_delay_days: values.predicted_delay_days,
        risk_level: probabilityRisk(values.delay_probability / 100),
        model_version: 'v2.4.1',
        created_at: new Date().toISOString(),
        notes: null,
      }
      client.setQueryData<PredictionList>(predictionKey, (current) =>
        current
          ? { predictions: [created, ...current.predictions], total: current.total + 1 }
          : { predictions: [created], total: 1 },
      )
      return created
    },
    onSuccess: (prediction) => {
      success(
        'Prediction recorded',
        `${formatPercent(prediction.delay_probability)} chance of a ${prediction.predicted_delay_days}-day slip.`,
      )
      setPredictOpen(false)
      predictForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.risk.all() })
    },
    onError: (mutationError) => toastError('Could not record prediction', mutationError.message),
  })

  const riskScoreTone = healthTone(health?.health)
  const probabilityPreview = Number(predictForm.watch('delay_probability')) || 0
  const previewRisk = probabilityRisk(probabilityPreview / 100)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Intelligence"
        title="Project risk"
        description="Composite risk score, milestone slippage and model forecasts for every active project."
        demo={milestonesQuery.isDemo || healthQuery.isDemo || predictionsQuery.isDemo}
        actions={
          <>
            <Select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="w-full sm:w-60"
              aria-label="Select project"
            >
              {DEMO_PROJECTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code} · {option.title}
                </option>
              ))}
            </Select>
            <Button variant="outline" onClick={openPredict}>
              <Activity />
              Record prediction
            </Button>
            <Button onClick={openTrack}>
              <Flag />
              Track milestone
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Risk score"
          value={`${project.risk_score}/100`}
          icon={Gauge}
          tone={project.risk_score > 75 ? 'danger' : project.risk_score > 50 ? 'warning' : 'success'}
          hint="Composite across cost, schedule and quality"
        />
        <StatCard
          label="Project health"
          value={humanize(health?.health)}
          icon={AlertTriangle}
          tone={riskScoreTone}
          hint={
            health
              ? `${health.overdue_count} overdue · ${health.prediction_count} predictions`
              : 'Waiting for the health report'
          }
        />
        <StatCard
          label="Overdue milestones"
          value={health?.overdue_count ?? '—'}
          icon={Flag}
          tone={health && health.overdue_count > 0 ? 'danger' : 'success'}
          hint={`${health?.milestone_count ?? milestones.length} milestones tracked`}
        />
        <StatCard
          label="Forecast slip"
          value={forecast.maxDelay === null ? '—' : `${forecast.maxDelay} d`}
          icon={Clock}
          tone={forecast.maxDelay !== null && forecast.maxDelay > 20 ? 'danger' : 'warning'}
          hint={
            forecast.averageProbability === null
              ? 'No predictions yet'
              : `${formatPercent(forecast.averageProbability)} average probability`
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardToolbar
            title="Risk score"
            description={project.title}
            actions={<Badge tone="neutral">{project.code}</Badge>}
          />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <ScoreGauge
                value={project.risk_score}
                label="Risk score"
                tone={riskScoreTone === 'danger' ? 'danger' : riskScoreTone === 'warning' ? 'warning' : 'success'}
                caption={health ? `${humanize(health.health)} health` : 'Health pending'}
              />
              <dl className="min-w-0 flex-1 space-y-2 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Client</dt>
                  <dd className="truncate text-right font-medium text-foreground">{project.client}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Manager</dt>
                  <dd className="truncate text-right font-medium text-foreground">{project.manager}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Site</dt>
                  <dd className="truncate text-right font-medium text-foreground">{project.site_name}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Window</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDate(project.start_date)} → {formatDate(project.end_date)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3">
              <ProgressRow
                label="Budget used"
                value={project.spent}
                max={project.budget}
                hint={`${formatCurrency(project.spent, { compact: true })} of ${formatCurrency(
                  project.budget,
                  { compact: true },
                )}`}
                tone={project.spent / project.budget > 0.85 ? 'danger' : 'warning'}
              />
              <ProgressRow
                label="Schedule progress"
                value={project.progress}
                hint={`${project.progress}%`}
                tone="info"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col xl:col-span-2">
          <CardToolbar
            title="Milestone progress"
            description="Planned window and completion for each milestone."
            actions={<Badge tone="neutral">{milestones.length} milestones</Badge>}
          />
          <CardContent className="flex-1">
            {milestonesQuery.isLoading ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : milestonesQuery.isError ? (
              <EmptyState
                icon={AlertTriangle}
                compact
                title="Could not load milestones"
                description={milestonesQuery.error?.message ?? 'The project risk service did not respond.'}
                action={
                  <Button size="sm" variant="outline" onClick={() => void milestonesQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : milestones.length === 0 ? (
              <EmptyState
                compact
                title="No milestones yet"
                description="Track the first milestone to start monitoring slippage."
                action={
                  <Button size="sm" onClick={openTrack}>
                    <Flag />
                    Track milestone
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{milestone.name}</p>
                        <p className="text-2xs text-muted-foreground">
                          {formatDate(milestone.planned_start)} → {formatDate(milestone.planned_end)}
                        </p>
                      </div>
                      <StatusBadge status={milestone.status} />
                    </div>
                    <Progress
                      value={milestone.progress_pct}
                      size="sm"
                      tone={milestoneTone(milestone.status)}
                      className="mt-2"
                      label={`${milestone.name} progress`}
                    />
                    <p className="mt-1 text-right text-2xs tabular text-muted-foreground">
                      {milestone.progress_pct}% complete
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardToolbar
            title="Predictions by severity"
            description="Model forecasts grouped by risk level, worst first."
            actions={<Badge tone="neutral">{predictions.length} predictions</Badge>}
          />
          <CardContent className="flex-1 space-y-4">
            {predictionsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : predictionsQuery.isError ? (
              <EmptyState
                icon={AlertTriangle}
                compact
                title="Could not load predictions"
                description={predictionsQuery.error?.message ?? 'The risk service did not respond.'}
                action={
                  <Button size="sm" variant="outline" onClick={() => void predictionsQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : grouped.length === 0 ? (
              <EmptyState
                compact
                title="No predictions yet"
                description="Run a prediction to see which milestones are likely to slip."
                action={
                  <Button size="sm" onClick={openPredict}>
                    <Activity />
                    Record prediction
                  </Button>
                }
              />
            ) : (
              grouped.map(({ level, items }) => (
                <div key={level} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={level} />
                    <span className="text-2xs text-muted-foreground">
                      {items.length} milestone{items.length === 1 ? '' : 's'}
                    </span>
                    <span className="ml-auto h-px flex-1 bg-border" aria-hidden="true" />
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((prediction) => {
                      const milestone = milestoneById.get(prediction.milestone_id)
                      return (
                        <li
                          key={prediction.id}
                          className="rounded-lg border border-border bg-surface px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">
                                {milestone?.name ?? prediction.milestone_id}
                              </p>
                              <p className="text-2xs text-muted-foreground">
                                {formatRelative(prediction.created_at)} · model{' '}
                                {prediction.model_version}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="tabular text-xs font-semibold text-foreground">
                                +{prediction.predicted_delay_days} d
                              </p>
                              <p className="text-2xs text-muted-foreground">
                                {formatPercent(prediction.delay_probability)} likely
                              </p>
                            </div>
                          </div>
                          <Progress
                            value={prediction.delay_probability * 100}
                            size="sm"
                            tone={riskProgressTone(prediction.risk_level)}
                            className="mt-2"
                            label={`${milestone?.name ?? 'Milestone'} delay probability`}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Delay forecast"
            description="Worst projected slip for this project."
            actions={topPrediction ? <RiskBadge level={topPrediction.risk_level} /> : null}
          />
          <CardContent className="flex-1">
            {predictionsQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !topPrediction ? (
              <EmptyState
                compact
                title="Nothing forecast"
                description="Record a prediction to get a delay forecast."
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-semibold leading-none tracking-tight tabular text-foreground">
                    {topPrediction.predicted_delay_days}
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">days</span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {milestoneById.get(topPrediction.milestone_id)?.name ??
                      topPrediction.milestone_id}{' '}
                    has a {formatPercent(topPrediction.delay_probability)} chance of slipping by
                    this much.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-2xs text-muted-foreground">
                    <span>Delay probability</span>
                    <span className="tabular">{formatPercent(topPrediction.delay_probability)}</span>
                  </div>
                  <Progress
                    value={topPrediction.delay_probability * 100}
                    tone={riskProgressTone(topPrediction.risk_level)}
                    label="Delay probability"
                  />
                </div>
                <dl className="space-y-2 border-t border-border pt-3 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="font-mono text-2xs text-foreground">
                      {topPrediction.model_version}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">Scored</dt>
                    <dd className="text-foreground">{formatRelative(topPrediction.created_at)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">Milestones at risk</dt>
                    <dd className="tabular text-foreground">
                      {predictions.filter((prediction) => prediction.risk_level !== 'low').length}
                    </dd>
                  </div>
                </dl>
                <Button variant="outline" size="sm" className="w-full" onClick={openPredict}>
                  <Activity />
                  Refresh forecast
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={trackOpen}
        onClose={() => setTrackOpen(false)}
        title="Track milestone"
        description={`Add a milestone to ${project.title}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTrackOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="track-form" loading={trackMutation.isPending}>
              Track milestone
            </Button>
          </>
        }
      >
        <form
          id="track-form"
          className="space-y-4"
          onSubmit={trackForm.handleSubmit((values) => trackMutation.mutate(values))}
        >
          <Field
            label="Milestone name"
            htmlFor="milestone_name"
            required
            error={trackForm.formState.errors.name?.message}
          >
            <Input
              id="milestone_name"
              placeholder="Roof & cladding"
              {...trackForm.register('name')}
              aria-invalid={Boolean(trackForm.formState.errors.name)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Planned start"
              htmlFor="planned_start"
              error={trackForm.formState.errors.planned_start?.message}
            >
              <Input
                id="planned_start"
                type="date"
                {...trackForm.register('planned_start')}
                aria-invalid={Boolean(trackForm.formState.errors.planned_start)}
              />
            </Field>
            <Field
              label="Planned end"
              htmlFor="planned_end"
              error={trackForm.formState.errors.planned_end?.message}
            >
              <Input
                id="planned_end"
                type="date"
                {...trackForm.register('planned_end')}
                aria-invalid={Boolean(trackForm.formState.errors.planned_end)}
              />
            </Field>
          </div>
          <Field
            label="Status"
            htmlFor="milestone_status"
            error={trackForm.formState.errors.status?.message}
          >
            <Select id="milestone_status" {...trackForm.register('status')}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={predictOpen}
        onClose={() => setPredictOpen(false)}
        title="Record prediction"
        description={`Store a delay forecast for a milestone in ${project.title}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPredictOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="predict-risk-form" loading={predictMutation.isPending}>
              Record prediction
            </Button>
          </>
        }
      >
        <form
          id="predict-risk-form"
          className="space-y-4"
          onSubmit={predictForm.handleSubmit((values) => predictMutation.mutate(values))}
        >
          <Field
            label="Milestone"
            htmlFor="milestone_id"
            error={predictForm.formState.errors.milestone_id?.message}
          >
            <Select id="milestone_id" {...predictForm.register('milestone_id')}>
              {milestones.length === 0 ? <option value="">No milestones</option> : null}
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Delay probability (%)"
              htmlFor="delay_probability"
              error={predictForm.formState.errors.delay_probability?.message}
            >
              <Input
                id="delay_probability"
                type="number"
                min={1}
                max={99}
                {...predictForm.register('delay_probability')}
                aria-invalid={Boolean(predictForm.formState.errors.delay_probability)}
              />
            </Field>
            <Field
              label="Predicted delay (days)"
              htmlFor="predicted_delay_days"
              error={predictForm.formState.errors.predicted_delay_days?.message}
            >
              <Input
                id="predicted_delay_days"
                type="number"
                min={1}
                max={365}
                {...predictForm.register('predicted_delay_days')}
                aria-invalid={Boolean(predictForm.formState.errors.predicted_delay_days)}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">Resulting risk band</p>
              <p className="text-2xs text-muted-foreground">
                Derived from the probability you enter.
              </p>
            </div>
            <RiskBadge level={previewRisk} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
