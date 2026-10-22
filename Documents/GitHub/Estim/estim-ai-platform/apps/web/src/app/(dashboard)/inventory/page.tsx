'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AlertTriangle,
  Boxes,
  Clipboard,
  Gauge,
  PackageSearch,
  Radar,
  Search,
  Sparkles,
} from 'lucide-react'

import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/label'
import { Input, InputWithIcon } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { ProgressRow } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { useAuth } from '@/lib/auth-context'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  inventoryApi,
  type DemandForecastList,
  type StockSnapshot,
  type StockSnapshotList,
  type StockoutCheck,
} from '@/lib/api/inventory'
import { DEMO_DEMAND_FORECAST_LIST, DEMO_STOCK_SNAPSHOT_LIST } from '@/lib/demo/inventory'
import { DEMO_SITES } from '@/lib/demo/projects'
import { formatNumber, formatRelative } from '@/lib/utils'

const SNAPSHOT_KEY = queryKeys.inventory.snapshots({ scope: 'page' })
const FORECAST_KEY = queryKeys.inventory.forecasts({ scope: 'page' })

const snapshotSchema = z.object({
  material_id: z.string().min(1, 'Material is required').max(60, 'That identifier is too long'),
  site_id: z.string().min(1, 'Select a site'),
  quantity_on_hand: z.coerce.number().min(0, 'Enter the quantity on hand'),
  unit: z.string().min(1, 'Unit is required').max(12, 'Use a short unit'),
  reorder_point: z.coerce.number().min(0, 'Enter the reorder point'),
})

type SnapshotValues = z.infer<typeof snapshotSchema>

const checkSchema = z.object({
  material_id: z.string().min(1, 'Select a material'),
  daily_demand: z.coerce.number().min(1, 'Enter the expected daily demand'),
  horizon_days: z.coerce.number().int().min(7, 'Use at least 7 days').max(180, 'Use 180 days or fewer'),
})

type CheckValues = z.infer<typeof checkSchema>

type CoverageFilter = 'all' | 'below' | 'healthy'

export default function InventoryPage() {
  const { user, isDemoSession } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [filter, setFilter] = useState<CoverageFilter>('all')
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)
  const [checkRequest, setCheckRequest] = useState<CheckValues | null>(null)

  const snapshotQuery = useDemoQuery<StockSnapshotList>({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => inventoryApi.listSnapshots({ limit: 100 }),
    demo: DEMO_STOCK_SNAPSHOT_LIST,
  })

  const forecastQuery = useDemoQuery<DemandForecastList>({
    queryKey: FORECAST_KEY,
    queryFn: () => inventoryApi.listForecasts({ limit: 100 }),
    demo: DEMO_DEMAND_FORECAST_LIST,
  })

  const snapshots = useMemo(() => snapshotQuery.data?.snapshots ?? [], [snapshotQuery.data])
  const forecasts = useMemo(() => forecastQuery.data?.forecasts ?? [], [forecastQuery.data])
  const demo = isDemoSession || snapshotQuery.isDemo || forecastQuery.isDemo

  const form = useForm<SnapshotValues>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      material_id: '',
      site_id: DEMO_SITES[0]?.id ?? '',
      quantity_on_hand: 0,
      unit: 'units',
      reorder_point: 0,
    },
  })

  const createMutation = useDemoMutation<StockSnapshot, SnapshotValues>({
    mutationFn: (values) =>
      inventoryApi.createSnapshot({
        ...values,
        recorded_at: new Date().toISOString(),
        metadata: {},
      }),
    demo: (values, client) => {
      const created: StockSnapshot = {
        id: `stock-demo-${Date.now()}`,
        material_id: values.material_id.trim().toUpperCase(),
        site_id: values.site_id,
        quantity_on_hand: values.quantity_on_hand,
        unit: values.unit,
        recorded_at: new Date().toISOString(),
        reorder_point: values.reorder_point,
        metadata: {},
      }
      client.setQueryData<StockSnapshotList>(SNAPSHOT_KEY, (previous) =>
        previous
          ? { ...previous, snapshots: [created, ...previous.snapshots], total: previous.total + 1 }
          : previous,
      )
      return created
    },
    onSuccess: (created) => {
      success(
        'Snapshot recorded',
        `${created.material_id} · ${formatNumber(created.quantity_on_hand)} ${created.unit} on hand.`,
      )
      setRecordOpen(false)
      form.reset({
        material_id: '',
        site_id: DEMO_SITES[0]?.id ?? '',
        quantity_on_hand: 0,
        unit: 'units',
        reorder_point: 0,
      })
      void queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
    },
    onError: (mutationError) => toastError('Could not record the snapshot', mutationError.message),
  })

  const checkForm = useForm<CheckValues>({
    resolver: zodResolver(checkSchema),
    defaultValues: {
      material_id: '',
      daily_demand: 25,
      horizon_days: 30,
    },
  })

  const requestedSnapshot = useMemo(
    () => (checkRequest ? snapshots.find((item) => item.material_id === checkRequest.material_id) : undefined),
    [checkRequest, snapshots],
  )

  const demoCheck = useMemo<StockoutCheck | null>(() => {
    if (!checkRequest || !requestedSnapshot) return null
    const days = requestedSnapshot.quantity_on_hand / Math.max(1, checkRequest.daily_demand)
    const required = checkRequest.daily_demand * checkRequest.horizon_days
    return {
      at_risk: requestedSnapshot.quantity_on_hand < required,
      days_of_cover: Math.round(days * 10) / 10,
      reorder_quantity: String(Math.max(0, Math.ceil(required - requestedSnapshot.quantity_on_hand))),
      recommendation_id: `rec-${requestedSnapshot.id}`,
      reason:
        requestedSnapshot.quantity_on_hand < required
          ? `Projected demand of ${formatNumber(required)} ${requestedSnapshot.unit} exceeds the ${formatNumber(
              requestedSnapshot.quantity_on_hand,
            )} on hand within ${checkRequest.horizon_days} days.`
          : `Stock covers ${checkRequest.horizon_days} days of projected demand.`,
    }
  }, [checkRequest, requestedSnapshot])

  const checkQuery = useDemoQuery<StockoutCheck>({
    queryKey: queryKeys.inventory.stockout({
      material_id: checkRequest?.material_id ?? '',
      site_id: requestedSnapshot?.site_id ?? '',
      daily_demand: checkRequest?.daily_demand ?? 0,
      horizon_days: checkRequest?.horizon_days ?? 0,
    }),
    queryFn: () =>
      inventoryApi.stockoutCheck({
        material_id: checkRequest!.material_id,
        site_id: requestedSnapshot!.site_id,
        daily_demand: checkRequest!.daily_demand,
        horizon_days: checkRequest!.horizon_days,
      }),
    enabled: Boolean(checkRequest && requestedSnapshot),
    demo: demoCheck ?? { at_risk: false },
  })

  const checkResult = checkQuery.data

  const demandByKey = useMemo(() => {
    const map = new Map<string, number>()
    forecasts.forEach((forecast) => {
      map.set(`${forecast.material_id}:${forecast.site_id}`, forecast.predicted_quantity)
    })
    return map
  }, [forecasts])

  const stats = useMemo(() => {
    const materials = new Set(snapshots.map((snapshot) => snapshot.material_id)).size
    const below = snapshots.filter((snapshot) => snapshot.quantity_on_hand < snapshot.reorder_point)
    const atRisk = snapshots.filter(
      (snapshot) =>
        (demandByKey.get(`${snapshot.material_id}:${snapshot.site_id}`) ?? 0) > snapshot.quantity_on_hand,
    )
    const coverage = snapshots.length
      ? snapshots.reduce(
          (sum, snapshot) =>
            sum + (snapshot.reorder_point > 0 ? snapshot.quantity_on_hand / snapshot.reorder_point : 1),
          0,
        ) / snapshots.length
      : 0
    return { materials, below: below.length, atRisk: atRisk.length, coverage }
  }, [snapshots, demandByKey])

  const coverageRows = useMemo(
    () =>
      [...snapshots]
        .sort((a, b) => {
          const ratioA = a.reorder_point > 0 ? a.quantity_on_hand / a.reorder_point : 99
          const ratioB = b.reorder_point > 0 ? b.quantity_on_hand / b.reorder_point : 99
          return ratioA - ratioB
        })
        .slice(0, 8),
    [snapshots],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return snapshots.filter((snapshot) => {
      const below = snapshot.quantity_on_hand < snapshot.reorder_point
      if (filter === 'below' && !below) return false
      if (filter === 'healthy' && below) return false
      if (term && !`${snapshot.material_id} ${snapshot.site_id}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [snapshots, filter, search])

  const lowStock = useMemo(
    () =>
      snapshots
        .filter((snapshot) => snapshot.quantity_on_hand < snapshot.reorder_point)
        .sort(
          (a, b) =>
            a.quantity_on_hand / Math.max(a.reorder_point, 1) - b.quantity_on_hand / Math.max(b.reorder_point, 1),
        )
        .slice(0, 5),
    [snapshots],
  )

  const columns: Column<StockSnapshot>[] = [
    {
      id: 'material',
      header: 'Material',
      sortValue: (row) => row.material_id,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-foreground">{row.material_id}</p>
          <p className="text-2xs text-muted-foreground">{row.site_id}</p>
        </div>
      ),
    },
    {
      id: 'onHand',
      header: 'On hand',
      align: 'right',
      sortValue: (row) => row.quantity_on_hand,
      cell: (row) => (
        <span className="whitespace-nowrap tabular text-xs font-medium text-foreground">
          {formatNumber(row.quantity_on_hand)} <span className="text-muted-foreground">{row.unit}</span>
        </span>
      ),
    },
    {
      id: 'reorder',
      header: 'Reorder point',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.reorder_point,
      cell: (row) => (
        <span className="tabular text-xs text-muted-foreground">{formatNumber(row.reorder_point)}</span>
      ),
    },
    {
      id: 'coverage',
      header: 'Coverage',
      hideOnMobile: true,
      sortValue: (row) => (row.reorder_point > 0 ? row.quantity_on_hand / row.reorder_point : 99),
      cell: (row) => {
        const ratio = row.reorder_point > 0 ? row.quantity_on_hand / row.reorder_point : 1
        const tone = ratio < 1 ? 'danger' : ratio < 1.25 ? 'warning' : 'success'
        return (
          <Badge tone={tone} dot>
            {Math.round(ratio * 100)}% of reorder
          </Badge>
        )
      },
    },
    {
      id: 'recorded',
      header: 'Recorded',
      hideOnMobile: true,
      sortValue: (row) => row.recorded_at,
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.recorded_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI modules"
        title="Inventory intelligence"
        description="Stock positions, projected demand and stockout risk across every site — refreshed from the latest material snapshots."
        demo={demo}
        actions={
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <Clipboard />
            Record snapshot
          </Button>
        }
      />

      <section aria-label="Inventory indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Materials tracked"
          value={stats.materials}
          icon={Boxes}
          tone="primary"
          hint={`${snapshots.length} snapshots across ${new Set(snapshots.map((item) => item.site_id)).size} sites`}
          loading={snapshotQuery.isLoading}
        />
        <StatCard
          label="Below reorder point"
          value={stats.below}
          icon={AlertTriangle}
          tone="danger"
          hint="Replenishment needed"
          loading={snapshotQuery.isLoading}
        />
        <StatCard
          label="Demand exceeds stock"
          value={stats.atRisk}
          icon={Radar}
          tone="warning"
          hint="Based on 30-day forecasts"
          loading={snapshotQuery.isLoading || forecastQuery.isLoading}
        />
        <StatCard
          label="Avg. stock cover"
          value={`${Math.round(stats.coverage * 100)}%`}
          icon={Gauge}
          tone="info"
          hint="Of the reorder threshold"
          loading={snapshotQuery.isLoading}
        />
      </section>

      <section aria-label="Inventory analytics" className="grid gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardToolbar
            title="Stock cover"
            description="Lowest cover first, measured against each material's reorder point."
            actions={<Badge tone="neutral">Top 8</Badge>}
          />
          <CardContent className="space-y-3.5">
            {snapshotQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading stock positions…</p>
            ) : coverageRows.length === 0 ? (
              <EmptyState
                compact
                title="No stock snapshots yet"
                description="Record a snapshot to start tracking cover by material."
              />
            ) : (
              coverageRows.map((snapshot) => {
                const ratio =
                  snapshot.reorder_point > 0 ? snapshot.quantity_on_hand / snapshot.reorder_point : 1
                const tone = ratio < 1 ? 'danger' : ratio < 1.25 ? 'warning' : 'success'
                return (
                  <ProgressRow
                    key={snapshot.id}
                    label={`${snapshot.material_id} · ${snapshot.site_id}`}
                    value={Math.min(ratio, 2)}
                    max={2}
                    tone={tone}
                    hint={`${formatNumber(snapshot.quantity_on_hand)} ${snapshot.unit} / ${formatNumber(
                      snapshot.reorder_point,
                    )} reorder`}
                  />
                )
              })
            )}
          </CardContent>
          <CardFooter className="mt-auto flex-wrap gap-x-4 gap-y-1">
            <span className="text-2xs text-muted-foreground">
              Bars are capped at 200% of the reorder point; the marker is not a hard limit.
            </span>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Demand outlook"
            description="30-day material forecasts ready for planning."
            actions={
              <span className="text-2xs text-muted-foreground">{forecasts.length} runs</span>
            }
          />
          <CardContent className="flex-1">
            {forecastQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading forecasts…</p>
            ) : forecasts.length === 0 ? (
              <EmptyState
                compact
                title="No demand forecasts"
                description="Forecasts will appear once the inventory model has run."
              />
            ) : (
              <ul className="space-y-2.5">
                {forecasts.slice(0, 5).map((forecast) => (
                  <li key={forecast.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-2xs text-foreground">{forecast.material_id}</p>
                      <p className="text-2xs text-muted-foreground">
                        {formatNumber(forecast.predicted_quantity)} predicted ·{' '}
                        {formatNumber(forecast.confidence_low)}–{formatNumber(forecast.confidence_high)}
                      </p>
                    </div>
                    <StatusBadge status={forecast.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <span className="text-2xs text-muted-foreground">
              Horizon {forecasts[0]?.horizon_days ?? 30} days · model {forecasts[0]?.model_version ?? '—'}
            </span>
          </CardFooter>
        </Card>
      </section>

      <section aria-label="Stock snapshots" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Stock snapshots</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {snapshots.length} positions shown.
            </p>
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          loading={snapshotQuery.isLoading}
          error={snapshotQuery.isError ? snapshotQuery.error?.message ?? 'Could not load snapshots.' : null}
          onRetry={() => void snapshotQuery.refetch()}
          pageSize={10}
          emptyTitle="No stock positions match"
          emptyDescription="Adjust the filter or record a new snapshot."
          emptyAction={
            <Button size="sm" variant="outline" onClick={() => setRecordOpen(true)}>
              Record snapshot
            </Button>
          }
          toolbar={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <InputWithIcon
                icon={<Search />}
                placeholder="Search material or site…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:max-w-xs"
                aria-label="Search stock snapshots"
              />
              <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                <Select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as CoverageFilter)}
                  aria-label="Filter by coverage"
                  className="w-full sm:w-44"
                >
                  <option value="all">All positions</option>
                  <option value="below">Below reorder</option>
                  <option value="healthy">Healthy cover</option>
                </Select>
                {filter !== 'all' || search ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFilter('all')
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

      <section aria-label="Stockout checks" className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col">
          <CardToolbar
            title="Stockout check"
            description="Estimate cover for a material against expected daily demand."
            actions={<Badge tone="info"><Sparkles className="h-3 w-3" /> Model</Badge>}
          />
          <CardContent className="space-y-4">
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={checkForm.handleSubmit((values) => {
                setCheckRequest(values)
              })}
            >
              <Field
                label="Material"
                htmlFor="check_material"
                error={checkForm.formState.errors.material_id?.message}
                className="sm:col-span-3"
              >
                <Select
                  id="check_material"
                  {...checkForm.register('material_id')}
                  aria-invalid={Boolean(checkForm.formState.errors.material_id)}
                >
                  <option value="">Select a material…</option>
                  {snapshots.map((snapshot) => (
                    <option key={`${snapshot.material_id}-${snapshot.site_id}`} value={snapshot.material_id}>
                      {snapshot.material_id} · {snapshot.site_id}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Daily demand"
                htmlFor="daily_demand"
                error={checkForm.formState.errors.daily_demand?.message}
              >
                <Input
                  id="daily_demand"
                  type="number"
                  min={1}
                  {...checkForm.register('daily_demand')}
                  aria-invalid={Boolean(checkForm.formState.errors.daily_demand)}
                />
              </Field>
              <Field
                label="Horizon (days)"
                htmlFor="horizon_days"
                error={checkForm.formState.errors.horizon_days?.message}
              >
                <Input
                  id="horizon_days"
                  type="number"
                  min={7}
                  max={180}
                  {...checkForm.register('horizon_days')}
                  aria-invalid={Boolean(checkForm.formState.errors.horizon_days)}
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" className="w-full" loading={checkQuery.isFetching}>
                  <PackageSearch />
                  Check
                </Button>
              </div>
            </form>

            {checkRequest && checkResult ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {checkResult.at_risk ? (
                    <Badge tone="danger" dot>
                      Stockout risk
                    </Badge>
                  ) : (
                    <Badge tone="success" dot>
                      Covered
                    </Badge>
                  )}
                  <span className="font-mono text-2xs text-muted-foreground">
                    {checkRequest.material_id} · {requestedSnapshot?.site_id}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Days of cover</dt>
                    <dd className="mt-0.5 tabular text-lg font-semibold text-foreground">
                      {checkResult.days_of_cover ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-muted-foreground">
                      Suggested reorder
                    </dt>
                    <dd className="mt-0.5 tabular text-lg font-semibold text-foreground">
                      {checkResult.reorder_quantity ?? '—'}
                    </dd>
                  </div>
                </dl>
                {checkResult.reason ? (
                  <p className="text-2xs leading-relaxed text-muted-foreground">{checkResult.reason}</p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-2xs text-muted-foreground">
                Run a check to see projected cover and a recommended reorder quantity.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Low-stock alerts"
            description="Materials closest to running out."
            actions={<Badge tone="danger">{stats.below} below reorder</Badge>}
          />
          <CardContent className="flex-1">
            {snapshotQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading alerts…</p>
            ) : lowStock.length === 0 ? (
              <EmptyState compact title="Stock is healthy" description="No material is below its reorder point." />
            ) : (
              <ul className="space-y-2.5">
                {lowStock.map((snapshot) => {
                  const deficit = Math.max(0, snapshot.reorder_point - snapshot.quantity_on_hand)
                  const ratio =
                    snapshot.reorder_point > 0 ? snapshot.quantity_on_hand / snapshot.reorder_point : 0
                  return (
                    <li
                      key={snapshot.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-2xs text-foreground">{snapshot.material_id}</p>
                        <p className="text-2xs text-muted-foreground">
                          {snapshot.site_id} · {formatNumber(deficit)} {snapshot.unit} below reorder
                        </p>
                      </div>
                      <Badge tone={ratio < 0.5 ? 'danger' : 'warning'} dot>
                        {Math.round(ratio * 100)}%
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <span className="text-2xs text-muted-foreground">
              Alerts use each material’s configured reorder threshold.
            </span>
          </CardFooter>
        </Card>
      </section>

      {/* Record snapshot modal */}
      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record stock snapshot"
        description="Capture the quantity on hand for a material at a site."
        closeOnOverlayClick={!createMutation.isPending}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRecordOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="snapshot-form" loading={createMutation.isPending}>
              Save snapshot
            </Button>
          </>
        }
      >
        <form
          id="snapshot-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <Field label="Material ID" htmlFor="material_id" required error={form.formState.errors.material_id?.message}>
            <Input
              id="material_id"
              placeholder="MAT-CONC-40"
              {...form.register('material_id')}
              aria-invalid={Boolean(form.formState.errors.material_id)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site" htmlFor="site_id" required error={form.formState.errors.site_id?.message}>
              <Select
                id="site_id"
                {...form.register('site_id')}
                aria-invalid={Boolean(form.formState.errors.site_id)}
              >
                {DEMO_SITES.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit" htmlFor="unit" required error={form.formState.errors.unit?.message}>
              <Input
                id="unit"
                placeholder="m3"
                {...form.register('unit')}
                aria-invalid={Boolean(form.formState.errors.unit)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quantity on hand"
              htmlFor="quantity_on_hand"
              required
              error={form.formState.errors.quantity_on_hand?.message}
            >
              <Input
                id="quantity_on_hand"
                type="number"
                min={0}
                step="any"
                {...form.register('quantity_on_hand')}
                aria-invalid={Boolean(form.formState.errors.quantity_on_hand)}
              />
            </Field>
            <Field
              label="Reorder point"
              htmlFor="reorder_point"
              required
              error={form.formState.errors.reorder_point?.message}
            >
              <Input
                id="reorder_point"
                type="number"
                min={0}
                step="any"
                {...form.register('reorder_point')}
                aria-invalid={Boolean(form.formState.errors.reorder_point)}
              />
            </Field>
          </div>

          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
            Snapshots feed the cover chart and stockout checks. In demo mode the record is shown locally
            but not persisted.
          </p>
        </form>
      </Modal>
    </div>
  )
}
