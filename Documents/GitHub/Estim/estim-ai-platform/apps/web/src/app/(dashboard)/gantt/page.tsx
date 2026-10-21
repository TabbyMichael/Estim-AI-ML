'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarRange, CheckCircle2, Clock, RotateCcw } from 'lucide-react'
import type { Milestone } from '@/lib/api/risk'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { DEMO_PROJECTS, demoMilestones } from '@/lib/demo/projects'
import { cn, formatDate, formatNumber } from '@/lib/utils'

const DAY_MS = 86_400_000
const DEFAULT_PROJECT_ID = DEMO_PROJECTS[0]?.id ?? ''

type StatusFilter = 'all' | 'completed' | 'in_progress' | 'not_started' | 'delayed'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'not_started', label: 'Not started' },
  { value: 'delayed', label: 'Delayed' },
]

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-success',
  in_progress: 'bg-info',
  not_started: 'bg-muted-foreground',
  delayed: 'bg-destructive',
}

const STATUS_BAR: Record<string, { track: string; fill: string }> = {
  completed: { track: 'border-success/30 bg-success-muted', fill: 'bg-success/70' },
  in_progress: { track: 'border-info/30 bg-info-muted', fill: 'bg-info/70' },
  delayed: { track: 'border-destructive/30 bg-destructive-muted', fill: 'bg-destructive/70' },
  not_started: { track: 'border-border bg-muted', fill: 'bg-muted-foreground/40' },
}

type Timeline = {
  start: number
  span: number
  months: { key: string; label: string; left: number; width: number }[]
}

function buildTimeline(milestones: Milestone[]): Timeline | null {
  if (milestones.length === 0) return null
  const start = Math.min(...milestones.map((m) => new Date(m.planned_start).getTime()))
  const end = Math.max(...milestones.map((m) => new Date(m.planned_end).getTime()))
  const span = Math.max(DAY_MS, end - start)

  const months: Timeline['months'] = []
  const cursor = new Date(start)
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  while (cursor.getTime() <= end) {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + 1)
    const visibleStart = Math.max(cursor.getTime(), start)
    const visibleEnd = Math.min(next.getTime(), end)
    if (visibleEnd > visibleStart) {
      months.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: cursor.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        left: ((visibleStart - start) / span) * 100,
        width: ((visibleEnd - visibleStart) / span) * 100,
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return { start, span, months }
}

function progressOf(milestone: Milestone, overrides: Record<string, number>): number {
  return overrides[milestone.id] ?? milestone.progress_pct
}

export default function GanttPage() {
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  const project = DEMO_PROJECTS.find((item) => item.id === projectId) ?? DEMO_PROJECTS[0]
  const milestones = useMemo(() => demoMilestones(projectId), [projectId])
  const timeline = useMemo(() => buildTimeline(milestones), [milestones])

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? milestones
        : milestones.filter((milestone) => milestone.status === statusFilter),
    [milestones, statusFilter],
  )

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      not_started: 0,
      delayed: 0,
    }
    milestones.forEach((milestone) => {
      base[milestone.status] = (base[milestone.status] ?? 0) + 1
    })
    return base
  }, [milestones])

  const overdue = milestones.filter(
    (milestone) =>
      milestone.status !== 'completed' &&
      new Date(milestone.planned_end).getTime() < Date.now(),
  ).length
  const completedPct =
    milestones.length > 0 ? Math.round((counts.completed / milestones.length) * 100) : 0
  const hasOverrides = Object.keys(overrides).length > 0

  const todayPct = useMemo(() => {
    if (!timeline) return null
    const now = Date.now()
    if (now < timeline.start || now > timeline.start + timeline.span) return null
    return ((now - timeline.start) / timeline.span) * 100
  }, [timeline])

  const updateProgress = (id: string, raw: string) => {
    const parsed = Number(raw)
    const value = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : 0
    setOverrides((current) => ({ ...current, [id]: value }))
  }

  const columns = useMemo<Column<Milestone>[]>(
    () => [
      {
        id: 'name',
        header: 'Milestone',
        cell: (milestone) => (
          <span className="font-medium text-foreground">{milestone.name}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (milestone) => <StatusBadge status={milestone.status} />,
      },
      {
        id: 'start',
        header: 'Planned start',
        hideOnMobile: true,
        cell: (milestone) => (
          <span className="tabular text-muted-foreground">{formatDate(milestone.planned_start)}</span>
        ),
      },
      {
        id: 'end',
        header: 'Planned finish',
        hideOnMobile: true,
        cell: (milestone) => (
          <span className="tabular text-muted-foreground">{formatDate(milestone.planned_end)}</span>
        ),
      },
      {
        id: 'duration',
        header: 'Days',
        align: 'right',
        hideOnMobile: true,
        cell: (milestone) => {
          const days = Math.max(
            1,
            Math.round(
              (new Date(milestone.planned_end).getTime() -
                new Date(milestone.planned_start).getTime()) /
                DAY_MS,
            ),
          )
          return <span className="tabular">{formatNumber(days)}</span>
        },
      },
      {
        id: 'progress',
        header: 'Progress',
        align: 'right',
        cell: (milestone) => {
          const progress = progressOf(milestone, overrides)
          return (
            <div className="ml-auto flex w-28 items-center gap-2">
              <Progress
                value={progress}
                tone={progress >= 100 ? 'success' : 'primary'}
                size="sm"
                label={`${milestone.name} progress`}
              />
              <span className="tabular w-9 text-right text-2xs text-muted-foreground">
                {progress}%
              </span>
            </div>
          )
        },
      },
    ],
    [overrides],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Gantt timeline"
        description="Milestone schedule across the project plan. Drag-free progress editing updates the local preview so you can test what-if slip scenarios."
        demo
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="outline">Local preview</Badge>
            <Select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value)
                setOverrides({})
              }}
              aria-label="Project"
              className="w-[220px]"
            >
              {DEMO_PROJECTS.map((demoProject) => (
                <option key={demoProject.id} value={demoProject.id}>
                  {demoProject.code} · {demoProject.title}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Milestones"
          value={formatNumber(milestones.length)}
          hint={project ? project.title : undefined}
          icon={CalendarRange}
        />
        <StatCard
          label="Completed"
          value={`${completedPct}%`}
          hint={`${counts.completed} of ${milestones.length} milestones`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="In progress"
          value={formatNumber(counts.in_progress)}
          hint="Active work packages"
          icon={Clock}
          tone="info"
        />
        <StatCard
          label="Overdue"
          value={formatNumber(overdue)}
          hint={overdue > 0 ? 'Past planned finish date' : 'Nothing past due'}
          icon={AlertTriangle}
          tone={overdue > 0 ? 'danger' : 'success'}
        />
      </div>

      <Card>
        <CardToolbar
          title="Milestone timeline"
          description="Bars show planned duration; the fill shows recorded progress. Edit progress in the left column."
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filter by status"
                className="h-8 w-36 text-xs"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrides({})}
                disabled={!hasOverrides}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </Button>
            </div>
          }
        />
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-muted-foreground">
            {(['completed', 'in_progress', 'not_started', 'delayed'] as const).map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={cn('h-2 w-2 rounded-full', STATUS_DOT[status])}
                  aria-hidden="true"
                />
                <span className="capitalize">{status.replace('_', ' ')}</span>
                <span className="tabular text-foreground">{counts[status] ?? 0}</span>
              </span>
            ))}
            {todayPct !== null ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-dashed border-primary" aria-hidden="true" />
                Today
              </span>
            ) : null}
            {hasOverrides ? <Badge tone="warning">Unsaved local edits</Badge> : null}
          </div>

          {!timeline ? (
            <EmptyState
              icon={CalendarRange}
              title="No milestones"
              description="This project does not have a milestone plan yet."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No milestones match the filter"
              description="Try a different status or reset the filter."
              compact
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <div className="min-w-[860px]">
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-64 shrink-0 border-r border-border px-4 py-2 text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Milestone
                  </div>
                  <div className="relative h-8 flex-1">
                    {timeline.months.map((month) => (
                      <div
                        key={month.key}
                        className="absolute inset-y-0 flex items-center border-l border-border/60 px-2 text-2xs text-muted-foreground"
                        style={{ left: `${month.left}%`, width: `${month.width}%` }}
                      >
                        {month.label}
                      </div>
                    ))}
                    {todayPct !== null ? (
                      <div
                        className="absolute inset-y-0 z-10 border-l border-dashed border-primary"
                        style={{ left: `${todayPct}%` }}
                      >
                        <span className="absolute left-1 top-0.5 rounded bg-primary px-1 py-0.5 text-[9px] font-medium leading-none text-primary-foreground">
                          Today
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {filtered.map((milestone) => {
                  const start = new Date(milestone.planned_start).getTime()
                  const end = new Date(milestone.planned_end).getTime()
                  const left = ((start - timeline.start) / timeline.span) * 100
                  const width = Math.max(2, ((end - start) / timeline.span) * 100)
                  const progress = progressOf(milestone, overrides)
                  const bar = STATUS_BAR[milestone.status] ?? STATUS_BAR.not_started

                  return (
                    <div
                      key={milestone.id}
                      className="flex border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                    >
                      <div className="w-64 shrink-0 border-r border-border px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-medium text-foreground" title={milestone.name}>
                            {milestone.name}
                          </p>
                          <StatusBadge status={milestone.status} className="shrink-0" />
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={progress}
                            onChange={(event) => updateProgress(milestone.id, event.target.value)}
                            aria-label={`Progress for ${milestone.name}`}
                            className="h-7 w-16 px-2 text-xs tabular"
                          />
                          <span className="text-2xs text-muted-foreground">%</span>
                          <span className="ml-auto text-2xs text-muted-foreground">
                            {formatDate(milestone.planned_end)}
                          </span>
                        </div>
                      </div>

                      <div className="relative flex-1 py-3 pr-3">
                        {todayPct !== null ? (
                          <span
                            className="absolute inset-y-0 border-l border-dashed border-primary/40"
                            style={{ left: `${todayPct}%` }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <div
                          className={cn(
                            'absolute top-1/2 h-7 -translate-y-1/2 overflow-hidden rounded-md border',
                            bar.track,
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${milestone.name}: ${formatDate(milestone.planned_start)} → ${formatDate(milestone.planned_end)}`}
                        >
                          <div
                            className={cn('h-full transition-[width] duration-300', bar.fill)}
                            style={{ width: `${progress}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-2xs font-semibold tabular text-foreground">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="mt-4 text-2xs text-muted-foreground">
            Timeline spans {timeline ? formatDate(new Date(timeline.start)) : '—'} to{' '}
            {timeline ? formatDate(new Date(timeline.start + timeline.span)) : '—'}. Progress edits
            stay in this browser session and are not written back to the API.
          </p>
        </CardContent>
      </Card>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(milestone) => milestone.id}
        pageSize={10}
        caption="Milestone schedule detail"
        emptyTitle="No milestones match the filter"
        emptyDescription="Change the status filter to see other milestones."
        toolbar={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn('h-2 w-2 rounded-full', STATUS_DOT.not_started)}
              aria-hidden="true"
            />
            {project ? `${project.code} · ${project.title}` : 'Project schedule'}
          </div>
        }
      />
    </div>
  )
}
