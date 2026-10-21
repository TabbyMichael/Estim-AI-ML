'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  ArrowRight,
  BadgeDollarSign,
  Gauge,
  ScanSearch,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

import { Badge, RiskBadge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Field } from '@/components/ui/label'
import { InputWithIcon } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { Textarea } from '@/components/ui/textarea'
import { BarSeriesChart } from '@/components/charts/modules'
import { ChartLegend } from '@/components/charts/overview'
import { useAuth } from '@/lib/auth-context'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  procurementApi,
  type AnomalyList,
  type AnomalyStatus,
  type ProcurementAnomaly,
  type ProcurementRiskLevel,
  type PurchaseOrder,
  type PurchaseOrderList,
} from '@/lib/api/procurement'
import {
  DEMO_ANOMALY_LIST,
  DEMO_PURCHASE_ORDER_LIST,
} from '@/lib/demo/procurement'
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatRelative,
  humanize,
} from '@/lib/utils'

const ANOMALY_KEY = queryKeys.procurement.anomalies({ scope: 'page' })
const ORDER_KEY = queryKeys.procurement.orders({ scope: 'page' })

const reviewSchema = z
  .object({
    decision: z.enum(['approve', 'reject', 'investigate']),
    notes: z.string().max(500, 'Keep notes under 500 characters').optional(),
  })
  .superRefine((values, context) => {
    if (values.decision !== 'approve' && (values.notes ?? '').trim().length < 8) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message: 'Add at least 8 characters explaining the decision',
      })
    }
  })

type ReviewValues = z.infer<typeof reviewSchema>

type Finding = {
  title: string
  detail: string
  severity: ProcurementRiskLevel
  weight: number
}

/** Heuristic PO scan used by the "Analyze PO" dialog. */
function analyzePurchaseOrder(
  order: PurchaseOrder,
  allOrders: PurchaseOrder[],
): { score: number; findings: Finding[] } {
  const findings: Finding[] = []
  const peers = allOrders.filter((candidate) => candidate.id !== order.id)

  order.line_items.forEach((line) => {
    const prices = peers
      .flatMap((candidate) => candidate.line_items)
      .filter((candidate) => candidate.material_id === line.material_id)
      .map((candidate) => candidate.unit_price)
      .sort((a, b) => a - b)

    if (prices.length >= 2) {
      const median = prices[Math.floor(prices.length / 2)]
      const variance = (line.unit_price - median) / median
      if (variance > 0.12) {
        findings.push({
          title: 'Line price above peer median',
          detail: `${line.material_name}: ${formatCurrency(line.unit_price)} vs peer median ${formatCurrency(
            median,
          )} (${formatPercent(variance)} above).`,
          severity: variance > 0.25 ? 'high' : 'medium',
          weight: variance > 0.25 ? 38 : 22,
        })
      }
    }
  })

  const horizon = 21 * 86_400_000
  const related = peers.filter(
    (candidate) =>
      candidate.supplier_id === order.supplier_id &&
      Math.abs(new Date(candidate.created_at).getTime() - new Date(order.created_at).getTime()) <
        horizon,
  )
  const combined = related.reduce((sum, candidate) => sum + candidate.total_amount, order.total_amount)
  if (related.length > 0 && combined > 750_000) {
    findings.push({
      title: 'Possible split purchase',
      detail: `${related.length + 1} orders to ${order.supplier_id} within 21 days total ${formatCurrency(
        combined,
        { compact: true, maximumFractionDigits: 1 },
      )} against a 750K threshold.`,
      severity: 'high',
      weight: 34,
    })
  }

  const roundLine = order.line_items.find((line) => line.quantity >= 500 && line.quantity % 100 === 0)
  if (roundLine) {
    findings.push({
      title: 'Round-number quantity',
      detail: `${roundLine.material_name} ordered at exactly ${roundLine.quantity} — confirm the measured quantity.`,
      severity: 'low',
      weight: 10,
    })
  }

  if (order.state === 'draft' || order.state === 'submitted') {
    findings.push({
      title: 'Not yet approved',
      detail: `The order is still “${humanize(order.state)}”; it needs approval before release.`,
      severity: 'low',
      weight: 8,
    })
  }

  if (findings.length === 0) {
    findings.push({
      title: 'No material anomalies detected',
      detail: 'Line pricing, supplier history and quantities are within tolerance.',
      severity: 'low',
      weight: 0,
    })
  }

  return {
    score: Math.min(98, findings.reduce((sum, finding) => sum + finding.weight, 0)),
    findings,
  }
}

export default function ProcurementPage() {
  const { user, isDemoSession } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [severity, setSeverity] = useState<'all' | ProcurementRiskLevel>('all')
  const [status, setStatus] = useState<'all' | AnomalyStatus>('all')
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<ProcurementAnomaly | null>(null)
  const [analyzeOpen, setAnalyzeOpen] = useState(false)
  const [analyzeId, setAnalyzeId] = useState('')

  const anomalyQuery = useDemoQuery<AnomalyList>({
    queryKey: ANOMALY_KEY,
    queryFn: () => procurementApi.listAnomalies({ limit: 100 }),
    demo: DEMO_ANOMALY_LIST,
  })

  const orderQuery = useDemoQuery<PurchaseOrderList>({
    queryKey: ORDER_KEY,
    queryFn: () => procurementApi.listPurchaseOrders({ limit: 100 }),
    demo: DEMO_PURCHASE_ORDER_LIST,
  })

  const anomalies = useMemo(() => anomalyQuery.data?.anomalies ?? [], [anomalyQuery.data])
  const orders = useMemo(() => orderQuery.data?.orders ?? [], [orderQuery.data])
  const demo = isDemoSession || anomalyQuery.isDemo || orderQuery.isDemo

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { decision: 'approve', notes: '' },
  })

  const reviewMutation = useDemoMutation<ProcurementAnomaly, { anomaly: ProcurementAnomaly; values: ReviewValues }>({
    mutationFn: ({ anomaly, values }) =>
      procurementApi.reviewAnomaly(anomaly.id, {
        decision: values.decision,
        reviewer_id: user?.id ?? 'usr-admin',
        notes: values.notes?.trim() || undefined,
      }),
    demo: ({ anomaly, values }, client) => {
      const reviewedAt = new Date().toISOString()
      const nextStatus: AnomalyStatus =
        values.decision === 'approve'
          ? 'approved'
          : values.decision === 'reject'
            ? 'rejected'
            : 'under_investigation'
      const updated: ProcurementAnomaly = {
        ...anomaly,
        status: nextStatus,
        review_decision: values.decision,
        review_notes: values.notes?.trim() || null,
        reviewed_by: user?.id ?? 'usr-admin',
        reviewed_at: reviewedAt,
      }
      client.setQueryData<AnomalyList>(ANOMALY_KEY, (previous) =>
        previous
          ? {
              ...previous,
              anomalies: previous.anomalies.map((item) => (item.id === anomaly.id ? updated : item)),
            }
          : previous,
      )
      return updated
    },
    onSuccess: (updated) => {
      success('Review recorded', `${updated.po_number} marked as ${humanize(updated.status)}.`)
      setSelected(null)
      void queryClient.invalidateQueries({ queryKey: ANOMALY_KEY })
    },
    onError: (mutationError) => toastError('Could not save the review', mutationError.message),
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return anomalies.filter((anomaly) => {
      if (severity !== 'all' && anomaly.risk_level !== severity) return false
      if (status !== 'all' && anomaly.status !== status) return false
      if (term && !`${anomaly.po_number} ${anomaly.anomaly_type}`.toLowerCase().includes(term)) {
        return false
      }
      return true
    })
  }, [anomalies, severity, status, search])

  const stats = useMemo(() => {
    const open = anomalies.filter(
      (anomaly) => anomaly.status === 'pending' || anomaly.status === 'under_investigation',
    )
    const highRisk = open.filter((anomaly) => anomaly.risk_level === 'high').length
    const exposure = open.reduce(
      (sum, anomaly) =>
        sum + (orders.find((order) => order.id === anomaly.purchase_order_id)?.total_amount ?? 0),
      0,
    )
    const averageScore = anomalies.length
      ? anomalies.reduce((sum, anomaly) => sum + anomaly.anomaly_score, 0) / anomalies.length
      : 0
    return { open: open.length, highRisk, exposure, averageScore }
  }, [anomalies, orders])

  const savings = useMemo(() => {
    let total = 0
    let count = 0
    anomalies.forEach((anomaly) => {
      if (anomaly.anomaly_type !== 'price_variance') return
      count += 1
      const details = anomaly.details as {
        material?: string
        expected_unit_price?: number
        quoted_unit_price?: number
      }
      const order = orders.find((candidate) => candidate.id === anomaly.purchase_order_id)
      const quantity =
        order?.line_items.find((line) => line.material_id === details.material)?.quantity ?? 0
      const delta = (details.quoted_unit_price ?? 0) - (details.expected_unit_price ?? 0)
      total += Math.max(0, delta) * quantity
    })
    return { total, count }
  }, [anomalies, orders])

  const topExposures = useMemo(
    () =>
      anomalies
        .filter((anomaly) => anomaly.status === 'pending')
        .map((anomaly) => ({
          anomaly,
          amount: orders.find((order) => order.id === anomaly.purchase_order_id)?.total_amount ?? 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3),
    [anomalies, orders],
  )

  const firstPending = useMemo(
    () => anomalies.find((anomaly) => anomaly.status === 'pending') ?? null,
    [anomalies],
  )

  const trend = useMemo(() => {
    const buckets = Array.from({ length: 8 }, (_, index) => {
      const weeksAgo = 7 - index
      return {
        label: weeksAgo === 0 ? 'This wk' : `-${weeksAgo}w`,
        high: 0,
        medium: 0,
        low: 0,
      }
    })
    anomalies.forEach((anomaly) => {
      const ageDays = (Date.now() - new Date(anomaly.created_at).getTime()) / 86_400_000
      const index = 7 - Math.min(7, Math.floor(ageDays / 7))
      const bucket = buckets[index]
      if (bucket) bucket[anomaly.risk_level] += 1
    })
    return buckets
  }, [anomalies])

  const analyzedOrder = useMemo(
    () => orders.find((order) => order.id === analyzeId) ?? null,
    [orders, analyzeId],
  )
  const analysis = useMemo(
    () => (analyzedOrder ? analyzePurchaseOrder(analyzedOrder, orders) : null),
    [analyzedOrder, orders],
  )

  const openReview = (anomaly: ProcurementAnomaly) => {
    setSelected(anomaly)
    form.reset({ decision: anomaly.review_decision ?? 'approve', notes: anomaly.review_notes ?? '' })
  }

  const canReview =
    selected !== null &&
    (selected.status === 'pending' || selected.status === 'under_investigation')

  const openAnalyze = () => {
    setAnalyzeId((current) => current || orders[0]?.id || '')
    setAnalyzeOpen(true)
  }

  const columns: Column<ProcurementAnomaly>[] = [
    {
      id: 'po',
      header: 'Purchase order',
      sortValue: (row) => row.po_number,
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-foreground">{row.po_number}</p>
          <p className="text-2xs text-muted-foreground">{humanize(row.anomaly_type)}</p>
        </div>
      ),
    },
    {
      id: 'risk',
      header: 'Risk',
      sortValue: (row) => row.risk_level,
      cell: (row) => <RiskBadge level={row.risk_level} />,
    },
    {
      id: 'score',
      header: 'Score',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.anomaly_score,
      cell: (row) => (
        <span className="tabular text-xs font-medium">{formatPercent(row.anomaly_score, { digits: 0 })}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'created',
      header: 'Detected',
      hideOnMobile: true,
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          size="sm"
          variant={row.status === 'pending' || row.status === 'under_investigation' ? 'outline' : 'ghost'}
          onClick={(event) => {
            event.stopPropagation()
            openReview(row)
          }}
        >
          {row.status === 'pending' || row.status === 'under_investigation' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ]

  const filtersActive = severity !== 'all' || status !== 'all' || search.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI modules"
        title="Procurement intelligence"
        description="Anomaly detection across purchase orders — price variance, split purchases, duplicate invoices and delivery drift."
        demo={demo}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={openAnalyze} disabled={orders.length === 0}>
              <ScanSearch />
              Analyze PO
            </Button>
            <Button size="sm" onClick={() => firstPending && openReview(firstPending)} disabled={!firstPending}>
              <ShieldAlert />
              Review queue
            </Button>
          </>
        }
      />

      <section aria-label="Procurement indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open anomalies"
          value={stats.open}
          icon={ShieldAlert}
          tone="warning"
          hint={`${stats.highRisk} high severity`}
          loading={anomalyQuery.isLoading}
        />
        <StatCard
          label="High-risk findings"
          value={stats.highRisk}
          icon={Gauge}
          tone="danger"
          hint="Awaiting a decision"
          loading={anomalyQuery.isLoading}
        />
        <StatCard
          label="Value under review"
          value={formatCurrency(stats.exposure, { compact: true, maximumFractionDigits: 1 })}
          icon={BadgeDollarSign}
          tone="primary"
          hint={`${stats.open} linked purchase orders`}
          loading={anomalyQuery.isLoading || orderQuery.isLoading}
        />
        <StatCard
          label="Avg. anomaly score"
          value={formatPercent(stats.averageScore, { digits: 0 })}
          icon={Sparkles}
          tone="info"
          hint="Model confidence across detections"
          loading={anomalyQuery.isLoading}
        />
      </section>

      <section aria-label="Procurement analytics" className="grid gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardToolbar
            title="Anomaly trend"
            description="Detections per week, grouped by severity."
            actions={
              <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                Last 8 weeks
              </span>
            }
          />
          <CardContent className="pb-2">
            <BarSeriesChart
              data={trend}
              xKey="label"
              stacked
              height={248}
              series={[
                { key: 'high', label: 'High', tone: 'danger' },
                { key: 'medium', label: 'Medium', tone: 'warning' },
                { key: 'low', label: 'Low', tone: 'success' },
              ]}
              valueFormatter={(value) => `${value}`}
            />
          </CardContent>
          <CardFooter className="mt-auto">
            <ChartLegend
              items={[
                { label: 'High', tone: 'danger' },
                { label: 'Medium', tone: 'warning' },
                { label: 'Low', tone: 'success' },
              ]}
            />
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Savings identified"
            description="Price variance caught before release."
            actions={<Badge tone="success">{savings.count} findings</Badge>}
          />
          <CardContent className="flex-1 space-y-4">
            <div>
              <p className="text-3xl font-semibold leading-none tracking-tight tabular text-foreground">
                {formatCurrency(savings.total, { compact: true, maximumFractionDigits: 1 })}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">
                Potential exposure avoided across {savings.count} price-variance finding
                {savings.count === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Highest exposure
              </p>
              {topExposures.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-2xs text-muted-foreground">
                  Nothing pending review.
                </p>
              ) : (
                topExposures.map(({ anomaly, amount }) => (
                  <button
                    key={anomaly.id}
                    type="button"
                    onClick={() => openReview(anomaly)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-2xs text-foreground">
                        {anomaly.po_number}
                      </span>
                      <span className="block truncate text-2xs text-muted-foreground">
                        {humanize(anomaly.anomaly_type)} · {formatCurrency(amount, { compact: true })}
                      </span>
                    </span>
                    <RiskBadge level={anomaly.risk_level} />
                  </button>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => firstPending && openReview(firstPending)}
              disabled={!firstPending}
            >
              Review next
              <ArrowRight />
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section aria-label="Anomaly queue" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Anomaly queue</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {anomalies.length} detections shown.
            </p>
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          loading={anomalyQuery.isLoading}
          error={anomalyQuery.isError ? anomalyQuery.error?.message ?? 'Could not load anomalies.' : null}
          onRetry={() => void anomalyQuery.refetch()}
          onRowClick={openReview}
          pageSize={8}
          emptyTitle="No anomalies match these filters"
          emptyDescription="Try a different severity, status or search term."
          emptyAction={
            filtersActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSeverity('all')
                  setStatus('all')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
          toolbar={
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <InputWithIcon
                icon={<Search />}
                placeholder="Search PO number or anomaly type…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="lg:max-w-xs"
                aria-label="Search anomalies"
              />
              <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
                <Select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as 'all' | ProcurementRiskLevel)}
                  aria-label="Filter by severity"
                  className="w-full sm:w-36"
                >
                  <option value="all">All severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                <Select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as 'all' | AnomalyStatus)}
                  aria-label="Filter by status"
                  className="w-full sm:w-44"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_investigation">Under investigation</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
                {filtersActive ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSeverity('all')
                      setStatus('all')
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

      {/* Review / detail modal */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={canReview ? 'Review anomaly' : 'Anomaly detail'}
        description={
          selected
            ? `${selected.po_number} · ${humanize(selected.anomaly_type)} · detected ${formatRelative(selected.created_at)}`
            : undefined
        }
        closeOnOverlayClick={!reviewMutation.isPending}
        footer={
          canReview ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setSelected(null)}
                disabled={reviewMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" form="review-form" loading={reviewMutation.isPending}>
                Submit review
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          )
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={selected.risk_level} />
              <StatusBadge status={selected.status} />
              <Badge tone="neutral">
                Score {formatPercent(selected.anomaly_score, { digits: 0 })}
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Purchase order</dt>
                <dd className="mt-0.5 font-mono text-foreground">{selected.po_number}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Detected</dt>
                <dd className="mt-0.5 text-foreground">{formatDateTime(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Reviewed by</dt>
                <dd className="mt-0.5 text-foreground">{selected.reviewed_by ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Reviewed at</dt>
                <dd className="mt-0.5 text-foreground">
                  {selected.reviewed_at ? formatDateTime(selected.reviewed_at) : '—'}
                </dd>
              </div>
            </dl>

            {canReview ? (
              <form
                id="review-form"
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => {
                  if (!selected) return
                  reviewMutation.mutate({ anomaly: selected, values })
                })}
              >
                <Field
                  label="Decision"
                  htmlFor="decision"
                  error={form.formState.errors.decision?.message}
                >
                  <Select
                    id="decision"
                    {...form.register('decision')}
                    aria-invalid={Boolean(form.formState.errors.decision)}
                  >
                    <option value="approve">Approve — no action required</option>
                    <option value="reject">Reject — false positive</option>
                    <option value="investigate">Investigate — needs follow-up</option>
                  </Select>
                </Field>
                <Field
                  label="Reviewer notes"
                  htmlFor="notes"
                  hint="Required for reject and investigate decisions."
                  error={form.formState.errors.notes?.message}
                >
                  <Textarea
                    id="notes"
                    placeholder="What did you verify with the supplier or project team?"
                    {...form.register('notes')}
                    aria-invalid={Boolean(form.formState.errors.notes)}
                  />
                </Field>
              </form>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p className="font-medium text-foreground">
                  Decision: {humanize(selected.review_decision)}
                </p>
                <p className="mt-1 leading-relaxed text-muted-foreground">
                  {selected.review_notes ?? 'No reviewer notes were recorded.'}
                </p>
              </div>
            )}

            <details className="rounded-lg border border-border bg-surface px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-foreground">
                Detection details
              </summary>
              <pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed text-muted-foreground scrollbar-thin">
                {JSON.stringify(selected.details, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </Modal>

      {/* Analyze PO modal */}
      <Modal
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        title="Analyze purchase order"
        description="Run a deterministic heuristic scan before releasing the order."
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setAnalyzeOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Purchase order" htmlFor="analyze-po">
            <Select
              id="analyze-po"
              value={analyzeId}
              onChange={(event) => setAnalyzeId(event.target.value)}
            >
              {orders.length === 0 ? <option value="">No purchase orders available</option> : null}
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.po_number} · {formatCurrency(order.total_amount, { compact: true })} ·{' '}
                  {humanize(order.state)}
                </option>
              ))}
            </Select>
          </Field>

          {analyzedOrder && analysis ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-muted/30 p-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Supplier</dt>
                  <dd className="mt-0.5 font-mono text-foreground">{analyzedOrder.supplier_id}</dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Project</dt>
                  <dd className="mt-0.5 font-mono text-foreground">{analyzedOrder.project_id}</dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Total</dt>
                  <dd className="mt-0.5 tabular text-foreground">
                    {formatCurrency(analyzedOrder.total_amount, { compact: true })}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Risk score</dt>
                  <dd className="mt-0.5 tabular text-foreground">{analysis.score}/100</dd>
                </div>
              </dl>

              <ul className="space-y-2">
                {analysis.findings.map((finding) => (
                  <li
                    key={finding.title}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <RiskBadge level={finding.severity} />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-medium text-foreground">{finding.title}</p>
                      <p className="text-2xs leading-relaxed text-muted-foreground">{finding.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="text-2xs leading-relaxed text-muted-foreground">
                Heuristic scan only — confirm with the supplier or project team. Findings that look
                real should be tracked through the anomaly review flow.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Select a purchase order to scan.
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
