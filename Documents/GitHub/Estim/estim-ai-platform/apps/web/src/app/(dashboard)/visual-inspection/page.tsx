'use client'

import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Camera, ClipboardCheck, Plus, ScanEye, Search, ShieldAlert } from 'lucide-react'

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
import { BarSeriesChart } from '@/components/charts/modules'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  inspectionApi,
  type Inspection,
  type InspectionList,
  type InspectionSummary,
} from '@/lib/api/inspection'
import {
  DEMO_INSPECTION_LIST,
  DEMO_INSPECTION_SUMMARIES,
} from '@/lib/demo/inspection'
import { DEMO_PROJECTS, DEMO_SITES, demoProject } from '@/lib/demo/projects'
import { formatDate, formatNumber, formatRelative, humanize } from '@/lib/utils'

const INSPECTION_KEY = queryKeys.inspection.list({ scope: 'page' })

const createSchema = z.object({
  project_id: z.string().min(1, 'Select a project'),
  title: z
    .string()
    .trim()
    .min(5, 'Describe what is being inspected')
    .max(120, 'Keep the title under 120 characters'),
  site_id: z.string().min(1, 'Select a site'),
})

type CreateValues = z.infer<typeof createSchema>

type InspectionRow = {
  inspection: Inspection
  summary: InspectionSummary | undefined
}

type SeverityBucket = { severity: string; count: number; tone: 'danger' | 'warning' | 'info' | 'success' }

const SEVERITY_ORDER: { key: string; label: string; tone: SeverityBucket['tone'] }[] = [
  { key: 'critical', label: 'Critical', tone: 'danger' },
  { key: 'high', label: 'High', tone: 'danger' },
  { key: 'medium', label: 'Medium', tone: 'warning' },
  { key: 'low', label: 'Low', tone: 'info' },
  { key: 'none', label: 'No defects', tone: 'success' },
]

function severityBadgeTone(severity: string | undefined): 'danger' | 'warning' | 'info' | 'success' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'success'
  }
}

export default function VisualInspectionPage() {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_review' | 'completed' | 'scheduled'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const inspectionQuery = useDemoQuery<InspectionList>({
    queryKey: INSPECTION_KEY,
    queryFn: () => inspectionApi.listInspections({ limit: 100 }),
    demo: DEMO_INSPECTION_LIST,
  })

  const inspections = useMemo(
    () => inspectionQuery.data?.inspections ?? [],
    [inspectionQuery.data],
  )
  const isDemo = inspectionQuery.isDemo

  // Defect counts live on the per-inspection summary endpoint.
  const summaryQueries = useQueries({
    queries: inspections.map((inspection) => ({
      queryKey: queryKeys.inspection.summary(inspection.id),
      queryFn: () => inspectionApi.reviewSummary(inspection.id),
      enabled: !isDemo,
      staleTime: 60_000,
    })),
  })

  const rows = useMemo<InspectionRow[]>(
    () =>
      inspections.map((inspection, index) => ({
        inspection,
        summary: isDemo
          ? DEMO_INSPECTION_SUMMARIES[inspection.id]
          : summaryQueries[index]?.data,
      })),
    [inspections, isDemo, summaryQueries],
  )

  const stats = useMemo(() => {
    const open = rows.filter(
      (row) => row.inspection.status === 'in_review' || row.inspection.status === 'scheduled',
    ).length
    const defects = rows.reduce((sum, row) => sum + (row.summary?.detection_count ?? 0), 0)
    const rework = rows.filter((row) => row.summary?.needs_rework).length
    return { total: rows.length, open, defects, rework }
  }, [rows])

  const severityBuckets = useMemo<SeverityBucket[]>(
    () =>
      SEVERITY_ORDER.map((bucket) => ({
        severity: bucket.label,
        tone: bucket.tone,
        count: rows.filter((row) => (row.summary?.worst_severity ?? 'none') === bucket.key).length,
      })),
    [rows],
  )

  const reworkQueue = useMemo(
    () =>
      rows
        .filter((row) => row.summary?.needs_rework)
        .sort((a, b) => (b.summary?.detection_count ?? 0) - (a.summary?.detection_count ?? 0)),
    [rows],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(({ inspection }) => {
      if (statusFilter !== 'all' && inspection.status !== statusFilter) return false
      if (!term) return true
      return [inspection.title, inspection.project_id, inspection.site_id, inspection.id].some((value) =>
        value.toLowerCase().includes(term),
      )
    })
  }, [rows, statusFilter, search])

  const selected = useMemo(
    () => rows.find((row) => row.inspection.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      project_id: DEMO_PROJECTS[0]?.id ?? 'prj-1001',
      title: '',
      site_id: DEMO_SITES[0]?.id ?? 'SITE-RIV',
    },
  })

  const createMutation = useDemoMutation<Inspection, CreateValues>({
    mutationFn: (values) =>
      inspectionApi.createInspection({
        project_id: values.project_id,
        title: values.title,
        site_id: values.site_id,
      }),
    demo: (values, client) => {
      const created: Inspection = {
        id: `insp-demo-${Date.now()}`,
        project_id: values.project_id,
        site_id: values.site_id,
        title: values.title,
        status: 'scheduled',
        created_by: 'usr-admin',
        created_at: new Date().toISOString(),
      }
      client.setQueryData<InspectionList>(INSPECTION_KEY, (current) =>
        current
          ? {
              ...current,
              inspections: [created, ...current.inspections],
              total: current.total + 1,
            }
          : {
              inspections: [created],
              total: 1,
              skip: 0,
              limit: 100,
            },
      )
      return created
    },
    onSuccess: (created) => {
      success('Inspection scheduled', `${created.title} is queued for review.`)
      setCreateOpen(false)
      createForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.inspection.all() })
    },
    onError: (mutationError) => toastError('Could not create inspection', mutationError.message),
  })

  const columns: Column<InspectionRow>[] = [
    {
      id: 'title',
      header: 'Inspection',
      cell: ({ inspection }) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{inspection.title}</p>
          <p className="text-2xs text-muted-foreground">
            {demoProject(inspection.project_id).code} · {inspection.site_id} ·{' '}
            <span className="font-mono">{inspection.id}</span>
          </p>
        </div>
      ),
      sortValue: ({ inspection }) => inspection.title,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ inspection }) => <StatusBadge status={inspection.status} />,
      sortValue: ({ inspection }) => inspection.status,
    },
    {
      id: 'defects',
      header: 'Detections',
      align: 'right',
      cell: ({ summary }) => (
        <span className="tabular text-xs">{summary ? formatNumber(summary.detection_count) : '—'}</span>
      ),
      sortValue: ({ summary }) => summary?.detection_count ?? -1,
    },
    {
      id: 'severity',
      header: 'Worst severity',
      hideOnMobile: true,
      cell: ({ summary }) =>
        summary ? <RiskBadge level={summary.worst_severity} /> : <span className="text-2xs text-muted-foreground">—</span>,
      sortValue: ({ summary }) => summary?.worst_severity ?? '',
    },
    {
      id: 'rework',
      header: 'Rework',
      hideOnMobile: true,
      cell: ({ summary }) =>
        summary?.needs_rework ? (
          <Badge tone="danger" dot>
            Required
          </Badge>
        ) : (
          <Badge tone="success" dot>
            Clear
          </Badge>
        ),
      sortValue: ({ summary }) => (summary?.needs_rework ? 1 : 0),
    },
    {
      id: 'created',
      header: 'Captured',
      hideOnMobile: true,
      cell: ({ inspection }) => (
        <span className="text-2xs text-muted-foreground">{formatRelative(inspection.created_at)}</span>
      ),
      sortValue: ({ inspection }) => inspection.created_at,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: ({ inspection }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation()
            setSelectedId(inspection.id)
          }}
        >
          <ScanEye />
          Open
        </Button>
      ),
    },
  ]

  const worstShare =
    stats.total > 0 && reworkQueue.length > 0
      ? Math.round((reworkQueue.length / stats.total) * 100)
      : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI modules"
        title="Visual inspection"
        description="Review defect detections from site imagery, triage rework and keep quality records audit-ready."
        demo={isDemo}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New inspection
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Inspections"
          value={formatNumber(stats.total)}
          icon={Camera}
          hint="Across all active projects"
        />
        <StatCard
          label="Awaiting review"
          value={formatNumber(stats.open)}
          icon={ClipboardCheck}
          tone="warning"
          hint="Scheduled or in review"
        />
        <StatCard
          label="Detections"
          value={formatNumber(stats.defects)}
          icon={ScanEye}
          tone="info"
          hint="Model findings in the current view"
        />
        <StatCard
          label="Rework required"
          value={formatNumber(stats.rework)}
          icon={ShieldAlert}
          tone={stats.rework > 0 ? 'danger' : 'success'}
          hint={stats.rework > 0 ? `${worstShare}% of inspections` : 'No open rework'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardToolbar
            title="Severity distribution"
            description="Worst finding per inspection, bucketed by severity."
          />
          <CardContent>
            {inspectionQuery.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : rows.length === 0 ? (
              <EmptyState
                compact
                title="No inspections yet"
                description="Create an inspection to start collecting detections."
              />
            ) : (
              <BarSeriesChart
                data={severityBuckets}
                xKey="severity"
                series={[{ key: 'count', label: 'Inspections', tone: 'primary' }]}
                pointTones={severityBuckets.map((bucket) => bucket.tone)}
                valueFormatter={(value) => `${value} inspection${value === 1 ? '' : 's'}`}
                height={240}
              />
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Rework queue"
            description="Inspections flagged for corrective work."
            actions={<Badge tone={reworkQueue.length > 0 ? 'danger' : 'success'}>{reworkQueue.length} open</Badge>}
          />
          <CardContent className="flex-1">
            {inspectionQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : reworkQueue.length === 0 ? (
              <EmptyState compact title="No rework flagged" description="Every inspection passed review." />
            ) : (
              <ul className="space-y-2">
                {reworkQueue.map(({ inspection, summary }) => (
                  <li key={inspection.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(inspection.id)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-medium text-foreground">
                          {inspection.title}
                        </p>
                        <Badge tone={severityBadgeTone(summary?.worst_severity)} dot>
                          {humanize(summary?.worst_severity)}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress
                          value={Math.min(100, (summary?.detection_count ?? 0) * 12)}
                          tone={severityBadgeTone(summary?.worst_severity)}
                          size="sm"
                          className="flex-1"
                        />
                        <span className="tabular text-2xs text-muted-foreground">
                          {summary?.detection_count ?? 0} detections
                        </span>
                      </div>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        {inspection.site_id} · {formatRelative(inspection.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(row) => row.inspection.id}
        loading={inspectionQuery.isLoading}
        error={inspectionQuery.isDemo ? null : inspectionQuery.error?.message ?? null}
        onRetry={() => void inspectionQuery.refetch()}
        onRowClick={(row) => setSelectedId(row.inspection.id)}
        pageSize={8}
        emptyTitle="No inspections match"
        emptyDescription="Adjust the filters or schedule a new inspection."
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            New inspection
          </Button>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <InputWithIcon
              icon={<Search />}
              placeholder="Search title, project or site…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-64"
              aria-label="Search inspections"
            />
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'in_review' | 'completed' | 'scheduled')
              }
              className="w-40"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="in_review">In review</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
            </Select>
            <Badge tone="neutral" className="ml-auto">
              {filtered.length} of {rows.length}
            </Badge>
          </div>
        }
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New inspection"
        description="Schedule a visual review for a project site."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="inspection-form" loading={createMutation.isPending}>
              Create inspection
            </Button>
          </>
        }
      >
        <form
          id="inspection-form"
          className="space-y-4"
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
        >
          <Field
            label="Project"
            htmlFor="inspection_project"
            error={createForm.formState.errors.project_id?.message}
          >
            <Select id="inspection_project" {...createForm.register('project_id')}>
              {DEMO_PROJECTS.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Title"
            htmlFor="inspection_title"
            required
            error={createForm.formState.errors.title?.message}
          >
            <Input
              id="inspection_title"
              placeholder="Level 14 slab — pre-cover check"
              {...createForm.register('title')}
              aria-invalid={Boolean(createForm.formState.errors.title)}
            />
          </Field>
          <Field label="Site" htmlFor="inspection_site" error={createForm.formState.errors.site_id?.message}>
            <Select id="inspection_site" {...createForm.register('site_id')}>
              {DEMO_SITES.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.inspection.title ?? 'Inspection'}
        description={selected ? `${selected.inspection.site_id} · captured ${formatRelative(selected.inspection.created_at)}` : undefined}
        footer={
          <Button variant="outline" onClick={() => setSelectedId(null)}>
            Close
          </Button>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.inspection.status} />
              <Badge tone="neutral">{demoProject(selected.inspection.project_id).code}</Badge>
              <Badge tone="neutral">{selected.inspection.site_id}</Badge>
              <span className="font-mono text-2xs text-muted-foreground">{selected.inspection.id}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Detections</p>
                <p className="mt-1 tabular text-xl font-semibold text-foreground">
                  {selected.summary ? formatNumber(selected.summary.detection_count) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Worst severity</p>
                <p className="mt-1.5">
                  <RiskBadge level={selected.summary?.worst_severity} />
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">Rework</p>
                <p className="mt-1.5">
                  {selected.summary?.needs_rework ? (
                    <Badge tone="danger" dot>
                      Required
                    </Badge>
                  ) : (
                    <Badge tone="success" dot>
                      Clear
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Project</dt>
                <dd className="truncate text-right font-medium text-foreground">
                  {demoProject(selected.inspection.project_id).title}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Captured</dt>
                <dd className="text-foreground">{formatDate(selected.inspection.created_at)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Created by</dt>
                <dd className="text-foreground">{selected.inspection.created_by}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Site</dt>
                <dd className="text-foreground">{selected.inspection.site_id}</dd>
              </div>
            </dl>

            <p className="text-2xs leading-relaxed text-muted-foreground">
              Detection counts come from the inspection review summary. Open the inspection in the
              mobile capture app to attach imagery or record new detections.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
