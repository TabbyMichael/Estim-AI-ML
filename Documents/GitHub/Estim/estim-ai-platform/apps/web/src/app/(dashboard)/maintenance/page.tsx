'use client'

import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Activity, Gauge, Plus, Search, ShieldAlert, Truck, Wrench } from 'lucide-react'

import { Badge, RiskBadge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, InputWithIcon } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { Textarea } from '@/components/ui/textarea'
import { BarSeriesChart, ScoreGauge } from '@/components/charts/modules'
import { ChartLegend, type ChartTone } from '@/components/charts/overview'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  maintenanceApi,
  type Equipment,
  type EquipmentHealth,
  type EquipmentList,
  type MaintenancePrediction,
  type MaintenanceRiskLevel,
} from '@/lib/api/maintenance'
import { DEMO_EQUIPMENT_HEALTH, DEMO_EQUIPMENT_LIST, demoHealthScore } from '@/lib/demo/maintenance'
import { DEMO_SITES } from '@/lib/demo/projects'
import { cn, formatDate, formatNumber, humanize } from '@/lib/utils'

const EQUIPMENT_KEY = queryKeys.maintenance.equipment({ scope: 'page' })

const EQUIPMENT_TYPES = [
  'tower_crane',
  'crawler_crane',
  'excavator',
  'concrete_pump',
  'piling_rig',
  'telehandler',
  'boom_lift',
  'chiller',
  'generator',
  'welding_rig',
  'compressor',
]

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Give the asset a recognisable name')
    .max(80, 'Keep the name under 80 characters'),
  equipment_type: z.string().min(1, 'Select the equipment type'),
  site_id: z.string().min(1, 'Select the site'),
})

const serviceSchema = z.object({
  maintenance_type: z.enum(['preventive', 'corrective', 'inspection', 'overhaul']),
  description: z.string().max(500, 'Keep the notes under 500 characters').optional(),
  performed_by: z.string().max(80, 'Keep the name under 80 characters').optional(),
  downtime_hours: z.coerce.number().min(0, 'Cannot be negative').max(720, 'Use 720 hours or fewer'),
  cost: z.coerce.number().min(0, 'Cannot be negative').max(5_000_000, 'Check the cost figure'),
})

const predictSchema = z.object({
  failure_probability: z.coerce
    .number()
    .min(1, 'Enter at least 1%')
    .max(99, 'Enter 99% or less'),
  horizon_days: z.coerce.number().int().min(1, 'Use at least 1 day').max(180, 'Use 180 days or fewer'),
})

type RegisterValues = z.infer<typeof registerSchema>
type ServiceValues = z.infer<typeof serviceSchema>
type PredictValues = z.infer<typeof predictSchema>

type ScoredEquipment = {
  asset: Equipment
  health: EquipmentHealth | undefined
  score: number | null
}

type HealthBand = { band: string; tone: ChartTone; count: number }

function scoreTone(score: number | null): 'success' | 'warning' | 'danger' | 'primary' {
  if (score === null) return 'primary'
  if (score >= 70) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

function probabilityRisk(probability: number): MaintenanceRiskLevel {
  if (probability >= 0.8) return 'critical'
  if (probability >= 0.55) return 'high'
  if (probability >= 0.3) return 'medium'
  return 'low'
}

export default function MaintenancePage() {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'operational' | 'maintenance' | 'offline'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [predictOpen, setPredictOpen] = useState(false)

  const equipmentQuery = useDemoQuery<EquipmentList>({
    queryKey: EQUIPMENT_KEY,
    queryFn: () => maintenanceApi.listEquipment({ limit: 100 }),
    demo: DEMO_EQUIPMENT_LIST,
  })

  const equipment = useMemo(() => equipmentQuery.data?.equipment ?? [], [equipmentQuery.data])
  const isDemo = equipmentQuery.isDemo

  // Health reports are per-asset; in demo mode the fixtures already hold them.
  const healthQueries = useQueries({
    queries: equipment.map((asset) => ({
      queryKey: queryKeys.maintenance.health(asset.id),
      queryFn: () => maintenanceApi.healthReport(asset.id),
      enabled: !isDemo && Boolean(asset.id),
      staleTime: 60_000,
    })),
  })

  const scored = useMemo<ScoredEquipment[]>(
    () =>
      equipment.map((asset, index) => {
        const health = isDemo
          ? DEMO_EQUIPMENT_HEALTH[asset.id]
          : healthQueries[index]?.data
        return {
          asset,
          health,
          score: health ? demoHealthScore(health) : null,
        }
      }),
    [equipment, isDemo, healthQueries],
  )

  const stats = useMemo(() => {
    const withHealth = scored.filter((row) => row.health)
    const needsService = withHealth.filter((row) => row.health?.needs_maintenance).length
    const critical = withHealth.filter(
      (row) => row.health?.critical || row.health?.latest_risk === 'critical',
    ).length
    const average = withHealth.length
      ? Math.round(withHealth.reduce((sum, row) => sum + (row.score ?? 0), 0) / withHealth.length)
      : null
    return { tracked: equipment.length, needsService, critical, average, monitored: withHealth.length }
  }, [equipment.length, scored])

  const bands = useMemo<HealthBand[]>(() => {
    const buckets: HealthBand[] = [
      { band: '0–29', tone: 'danger', count: 0 },
      { band: '30–49', tone: 'danger', count: 0 },
      { band: '50–69', tone: 'warning', count: 0 },
      { band: '70–89', tone: 'info', count: 0 },
      { band: '90–100', tone: 'success', count: 0 },
    ]
    scored.forEach(({ score }) => {
      if (score === null) return
      if (score < 30) buckets[0].count += 1
      else if (score < 50) buckets[1].count += 1
      else if (score < 70) buckets[2].count += 1
      else if (score < 90) buckets[3].count += 1
      else buckets[4].count += 1
    })
    return buckets
  }, [scored])

  const attention = useMemo(
    () =>
      scored
        .filter(
          (row) =>
            row.health &&
            (row.health.needs_maintenance ||
              row.health.critical ||
              row.health.latest_risk === 'critical' ||
              (row.score ?? 100) < 60),
        )
        .sort((a, b) => (a.score ?? 100) - (b.score ?? 100)),
    [scored],
  )

  const selected = useMemo(
    () => scored.find((row) => row.asset.id === selectedId) ?? scored[0] ?? null,
    [scored, selectedId],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return scored.filter(({ asset }) => {
      if (statusFilter !== 'all' && asset.status !== statusFilter) return false
      if (!term) return true
      return [asset.name, asset.equipment_type, asset.site_id].some((value) =>
        value.toLowerCase().includes(term),
      )
    })
  }, [scored, statusFilter, search])

  const equipmentTypes = useMemo(
    () =>
      Array.from(new Set([...EQUIPMENT_TYPES, ...equipment.map((asset) => asset.equipment_type)])).sort(),
    [equipment],
  )

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      equipment_type: EQUIPMENT_TYPES[0],
      site_id: DEMO_SITES[0]?.id ?? 'SITE-RIV',
    },
  })

  const serviceForm = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      maintenance_type: 'preventive',
      description: '',
      performed_by: '',
      downtime_hours: 4,
      cost: 0,
    },
  })

  const predictForm = useForm<PredictValues>({
    resolver: zodResolver(predictSchema),
    defaultValues: { failure_probability: 25, horizon_days: 30 },
  })

  const registerMutation = useDemoMutation<Equipment, RegisterValues>({
    mutationFn: (values) => maintenanceApi.registerEquipment(values),
    demo: (values, client) => {
      const created: Equipment = {
        id: `eq-demo-${Date.now()}`,
        name: values.name,
        equipment_type: values.equipment_type,
        site_id: values.site_id,
        status: 'operational',
        operating_hours: 0,
        created_at: new Date().toISOString(),
      }
      const current = client.getQueryData<EquipmentList>(EQUIPMENT_KEY)
      if (current) {
        client.setQueryData<EquipmentList>(EQUIPMENT_KEY, {
          ...current,
          equipment: [created, ...current.equipment],
          total: current.total + 1,
        })
      }
      return created
    },
    onSuccess: (created) => {
      success('Equipment registered', `${created.name} was added to the maintenance register.`)
      setRegisterOpen(false)
      registerForm.reset()
      setSelectedId(created.id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all() })
    },
    onError: (mutationError) =>
      toastError('Could not register equipment', mutationError.message),
  })

  const serviceMutation = useDemoMutation<Record<string, unknown>, ServiceValues>({
    mutationFn: (values) =>
      maintenanceApi.logMaintenance(selected?.asset.id ?? '', {
        maintenance_type: values.maintenance_type,
        description: values.description?.trim() || undefined,
        performed_by: values.performed_by?.trim() || undefined,
        downtime_hours: values.downtime_hours,
        cost: values.cost,
      }),
    demo: (values) => ({
      id: `log-${Date.now()}`,
      equipment_id: selected?.asset.id ?? '',
      ...values,
    }),
    onSuccess: () => {
      success(
        'Maintenance logged',
        `${humanize(serviceForm.getValues('maintenance_type'))} work recorded for ${selected?.asset.name ?? 'the asset'}.`,
      )
      setServiceOpen(false)
      serviceForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all() })
    },
    onError: (mutationError) => toastError('Could not log maintenance', mutationError.message),
  })

  const predictMutation = useDemoMutation<MaintenancePrediction, PredictValues>({
    mutationFn: (values) =>
      maintenanceApi.recordPrediction(selected?.asset.id ?? '', {
        failure_probability: values.failure_probability / 100,
        horizon_days: values.horizon_days,
      }),
    demo: (values) => ({
      id: `mp-demo-${Date.now()}`,
      equipment_id: selected?.asset.id ?? '',
      failure_probability: values.failure_probability / 100,
      risk_level: probabilityRisk(values.failure_probability / 100),
      horizon_days: values.horizon_days,
      model_version: 'v3.1.0',
      created_at: new Date().toISOString(),
      notes: null,
    }),
    onSuccess: (prediction) => {
      success(
        'Prediction recorded',
        `${Math.round(prediction.failure_probability * 100)}% failure probability over ${prediction.horizon_days} days.`,
      )
      setPredictOpen(false)
      predictForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all() })
    },
    onError: (mutationError) => toastError('Could not record prediction', mutationError.message),
  })

  const columns: Column<ScoredEquipment>[] = [
    {
      id: 'asset',
      header: 'Asset',
      cell: ({ asset }) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{asset.name}</p>
          <p className="text-2xs text-muted-foreground">
            {humanize(asset.equipment_type)} · {asset.site_id}
          </p>
        </div>
      ),
      sortValue: ({ asset }) => asset.name,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ asset }) => <StatusBadge status={asset.status} />,
      sortValue: ({ asset }) => asset.status,
    },
    {
      id: 'hours',
      header: 'Operating hours',
      align: 'right',
      cell: ({ asset }) => (
        <span className="tabular text-xs">{formatNumber(asset.operating_hours)} h</span>
      ),
      sortValue: ({ asset }) => asset.operating_hours,
    },
    {
      id: 'health',
      header: 'Health',
      cell: ({ score, health }) =>
        score === null ? (
          <span className="text-2xs text-muted-foreground">
            {health === undefined ? 'No report' : '—'}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <Progress value={score} tone={scoreTone(score)} size="sm" className="w-16" />
            <span className="tabular text-xs text-foreground">{score}</span>
          </div>
        ),
      sortValue: (row) => row.score,
    },
    {
      id: 'risk',
      header: 'Risk',
      hideOnMobile: true,
      cell: ({ health }) => <RiskBadge level={health?.latest_risk} />,
      sortValue: ({ health }) => health?.latest_risk ?? '',
    },
    {
      id: 'registered',
      header: 'Registered',
      hideOnMobile: true,
      cell: ({ asset }) => (
        <span className="text-2xs text-muted-foreground">{formatDate(asset.created_at)}</span>
      ),
      sortValue: ({ asset }) => asset.created_at,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: ({ asset }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation()
            setSelectedId(asset.id)
            setServiceOpen(true)
          }}
        >
          <Wrench />
          Service
        </Button>
      ),
    },
  ]

  const probabilityPreview = Number(predictForm.watch('failure_probability')) || 0
  const previewRisk = probabilityRisk(probabilityPreview / 100)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Predictive maintenance"
        description="Track equipment health, catch failure risk early and keep every asset on its service schedule."
        demo={isDemo}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setPredictOpen(true)}
              disabled={!selected}
            >
              <Activity />
              Predict failure
            </Button>
            <Button onClick={() => setRegisterOpen(true)}>
              <Plus />
              Register equipment
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Equipment tracked"
          value={formatNumber(stats.tracked)}
          icon={Truck}
          hint={`${formatNumber(stats.monitored)} with health reports`}
        />
        <StatCard
          label="Needs service"
          value={formatNumber(stats.needsService)}
          icon={Wrench}
          tone="warning"
          hint="Flagged by the health engine"
        />
        <StatCard
          label="Critical assets"
          value={formatNumber(stats.critical)}
          icon={ShieldAlert}
          tone="danger"
          hint="Critical risk or business-critical"
        />
        <StatCard
          label="Average health"
          value={stats.average === null ? '—' : stats.average}
          icon={Gauge}
          tone={scoreTone(stats.average)}
          hint="Derived from risk signals"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardToolbar
            title="Fleet health distribution"
            description="Assets bucketed by derived health score."
            actions={
              <ChartLegend
                items={[
                  { label: 'Healthy', tone: 'success' },
                  { label: 'Watch', tone: 'warning' },
                  { label: 'At risk', tone: 'danger' },
                ]}
              />
            }
          />
          <CardContent>
            {equipmentQuery.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : stats.monitored === 0 ? (
              <EmptyState
                compact
                title="No health reports yet"
                description="Health reports appear once the maintenance service returns data for your assets."
              />
            ) : (
              <BarSeriesChart
                data={bands}
                xKey="band"
                series={[{ key: 'count', label: 'Assets', tone: 'primary' }]}
                pointTones={bands.map((entry) => entry.tone)}
                valueFormatter={(value) => `${value} ${value === 1 ? 'asset' : 'assets'}`}
                height={240}
              />
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Attention queue"
            description="Lowest health scores first."
            actions={
              <Badge tone={attention.length > 0 ? 'warning' : 'success'} dot>
                {attention.length} flagged
              </Badge>
            }
          />
          <CardContent className="flex-1">
            {equipmentQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : attention.length === 0 ? (
              <EmptyState
                compact
                title="Fleet is healthy"
                description="No asset currently needs service or shows elevated failure risk."
              />
            ) : (
              <ul className="space-y-2">
                {attention.slice(0, 6).map(({ asset, health, score }) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(asset.id)}
                      className={cn(
                        'w-full rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/40',
                        selected?.asset.id === asset.id && 'border-primary/40 bg-accent/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-foreground">
                          {asset.name}
                        </span>
                        <RiskBadge level={health?.latest_risk} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={score} tone={scoreTone(score)} size="sm" className="flex-1" />
                        <span className="tabular text-2xs text-muted-foreground">{score ?? '—'}</span>
                      </div>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        {asset.site_id} ·{' '}
                        {health?.needs_maintenance ? 'Service due' : 'Monitor closely'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(row) => row.asset.id}
            loading={equipmentQuery.isLoading}
            error={equipmentQuery.isDemo ? null : equipmentQuery.error?.message ?? null}
            onRetry={() => void equipmentQuery.refetch()}
            onRowClick={(row) => setSelectedId(row.asset.id)}
            pageSize={8}
            emptyTitle="No equipment matches"
            emptyDescription="Adjust the filters or register a new asset."
            emptyAction={
              <Button size="sm" onClick={() => setRegisterOpen(true)}>
                <Plus />
                Register equipment
              </Button>
            }
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <InputWithIcon
                  icon={<Search />}
                  placeholder="Search asset, type or site…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full sm:w-64"
                  aria-label="Search equipment"
                />
                <Select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as 'all' | 'operational' | 'maintenance' | 'offline',
                    )
                  }
                  className="w-40"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                </Select>
                <Badge tone="neutral" className="ml-auto">
                  {filtered.length} of {equipment.length}
                </Badge>
              </div>
            }
          />
        </div>

        <Card className="flex flex-col">
          <CardToolbar
            title="Health check"
            description="Latest report for the selected asset."
            actions={<Gauge className="h-4 w-4 text-muted-foreground" />}
          />
          <CardContent className="flex-1 space-y-4">
            <Select
              value={selected?.asset.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              aria-label="Select equipment"
              disabled={equipment.length === 0}
            >
              {equipment.length === 0 ? <option value="">No equipment</option> : null}
              {equipment.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </Select>

            {!selected ? (
              <EmptyState
                compact
                title="Nothing selected"
                description="Pick an asset to see its health report."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <ScoreGauge
                    value={selected.score}
                    label="Health"
                    tone={scoreTone(selected.score)}
                    caption={selected.health ? `${humanize(selected.health.latest_risk)} risk` : 'No report yet'}
                    className="h-32 w-32"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selected.asset.name}
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      {humanize(selected.asset.equipment_type)} · {selected.asset.site_id}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={selected.asset.status} />
                      <RiskBadge level={selected.health?.latest_risk} />
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-muted-foreground">
                      Operating hours
                    </dt>
                    <dd className="mt-0.5 tabular font-semibold text-foreground">
                      {formatNumber(selected.health?.operating_hours ?? selected.asset.operating_hours)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-muted-foreground">
                      MTBF
                    </dt>
                    <dd className="mt-0.5 tabular font-semibold text-foreground">
                      {selected.health ? `${formatNumber(selected.health.mtbf_hours)} h` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-muted-foreground">
                      Service
                    </dt>
                    <dd className="mt-0.5">
                      {selected.health?.needs_maintenance ? (
                        <Badge tone="warning" dot>
                          Due
                        </Badge>
                      ) : (
                        <Badge tone="success" dot>
                          Current
                        </Badge>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-muted-foreground">
                      Registered
                    </dt>
                    <dd className="mt-0.5 text-foreground">{formatDate(selected.asset.created_at)}</dd>
                  </div>
                </dl>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setServiceOpen(true)}>
                    <Wrench />
                    Log service
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => setPredictOpen(true)}>
                    <Activity />
                    Predict
                  </Button>
                </div>
                <p className="text-2xs leading-relaxed text-muted-foreground">
                  Health score is derived from the risk signals in the latest report — the API
                  exposes risk flags, not a score.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register equipment"
        description="Add an asset to the maintenance register."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="register-form" loading={registerMutation.isPending}>
              Register
            </Button>
          </>
        }
      >
        <form
          id="register-form"
          className="space-y-4"
          onSubmit={registerForm.handleSubmit((values) => registerMutation.mutate(values))}
        >
          <Field
            label="Asset name"
            htmlFor="name"
            required
            error={registerForm.formState.errors.name?.message}
          >
            <Input
              id="name"
              placeholder="Tower Crane TC-05"
              {...registerForm.register('name')}
              aria-invalid={Boolean(registerForm.formState.errors.name)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Equipment type"
              htmlFor="equipment_type"
              error={registerForm.formState.errors.equipment_type?.message}
            >
              <Select
                id="equipment_type"
                {...registerForm.register('equipment_type')}
                aria-invalid={Boolean(registerForm.formState.errors.equipment_type)}
              >
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Site"
              htmlFor="site_id"
              error={registerForm.formState.errors.site_id?.message}
            >
              <Select id="site_id" {...registerForm.register('site_id')}>
                {DEMO_SITES.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        title="Log maintenance"
        description={
          selected
            ? `Record service work for ${selected.asset.name}.`
            : 'Record service work for the selected asset.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setServiceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="service-form" loading={serviceMutation.isPending}>
              Save log
            </Button>
          </>
        }
      >
        <form
          id="service-form"
          className="space-y-4"
          onSubmit={serviceForm.handleSubmit((values) => serviceMutation.mutate(values))}
        >
          <Field
            label="Maintenance type"
            htmlFor="maintenance_type"
            error={serviceForm.formState.errors.maintenance_type?.message}
          >
            <Select id="maintenance_type" {...serviceForm.register('maintenance_type')}>
              <option value="preventive">Preventive</option>
              <option value="corrective">Corrective</option>
              <option value="inspection">Inspection</option>
              <option value="overhaul">Overhaul</option>
            </Select>
          </Field>
          <Field
            label="Performed by"
            htmlFor="performed_by"
            hint="Technician or crew that carried out the work."
            error={serviceForm.formState.errors.performed_by?.message}
          >
            <Input
              id="performed_by"
              placeholder="Dana Whitfield"
              {...serviceForm.register('performed_by')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Downtime (hours)"
              htmlFor="downtime_hours"
              error={serviceForm.formState.errors.downtime_hours?.message}
            >
              <Input
                id="downtime_hours"
                type="number"
                min={0}
                step={0.5}
                {...serviceForm.register('downtime_hours')}
                aria-invalid={Boolean(serviceForm.formState.errors.downtime_hours)}
              />
            </Field>
            <Field
              label="Cost (USD)"
              htmlFor="cost"
              error={serviceForm.formState.errors.cost?.message}
            >
              <Input
                id="cost"
                type="number"
                min={0}
                step={50}
                {...serviceForm.register('cost')}
                aria-invalid={Boolean(serviceForm.formState.errors.cost)}
              />
            </Field>
          </div>
          <Field
            label="Notes"
            htmlFor="description"
            hint="What was found and what was replaced."
            error={serviceForm.formState.errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              placeholder="Replaced hydraulic hose, topped up fluid, tested under load."
              {...serviceForm.register('description')}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={predictOpen}
        onClose={() => setPredictOpen(false)}
        title="Record failure prediction"
        description={
          selected
            ? `Store a model-scored failure probability for ${selected.asset.name}.`
            : 'Store a model-scored failure probability.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPredictOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="predict-form" loading={predictMutation.isPending}>
              Record prediction
            </Button>
          </>
        }
      >
        <form
          id="predict-form"
          className="space-y-4"
          onSubmit={predictForm.handleSubmit((values) => predictMutation.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Failure probability (%)"
              htmlFor="failure_probability"
              error={predictForm.formState.errors.failure_probability?.message}
            >
              <Input
                id="failure_probability"
                type="number"
                min={1}
                max={99}
                {...predictForm.register('failure_probability')}
                aria-invalid={Boolean(predictForm.formState.errors.failure_probability)}
              />
            </Field>
            <Field
              label="Horizon (days)"
              htmlFor="horizon_days"
              error={predictForm.formState.errors.horizon_days?.message}
            >
              <Input
                id="horizon_days"
                type="number"
                min={1}
                max={180}
                {...predictForm.register('horizon_days')}
                aria-invalid={Boolean(predictForm.formState.errors.horizon_days)}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">Resulting risk band</p>
              <p className="text-2xs text-muted-foreground">
                The band is derived from the probability you enter.
              </p>
            </div>
            <RiskBadge level={previewRisk} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
