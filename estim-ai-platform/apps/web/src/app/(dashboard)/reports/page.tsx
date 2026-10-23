'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  Play,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { InputWithIcon } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { useAuth } from '@/lib/auth-context'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  reportsApi,
  type Report,
  type ReportFormat,
  type ReportList,
  type ReportSchedule,
} from '@/lib/api/reports'
import {
  DEMO_REPORT_LIST,
  DEMO_REPORT_SCHEDULES,
  DEMO_REPORT_TYPES,
} from '@/lib/demo/reports'
import { formatDateTime, formatNumber, formatRelative, humanize } from '@/lib/utils'

const REPORT_KEY = queryKeys.reports.list({ scope: 'page' })
const SCHEDULE_KEY = queryKeys.reports.schedules()

const generateSchema = z.object({
  report_type: z.string().min(1, 'Select a report type'),
  format: z.enum(['markdown', 'json', 'csv']),
})

const scheduleSchema = z.object({
  report_type: z.string().min(1, 'Select a report type'),
  interval: z.enum(['daily', 'weekly']),
})

type GenerateValues = z.infer<typeof generateSchema>
type ScheduleValues = z.infer<typeof scheduleSchema>

const FORMAT_EXTENSION: Record<ReportFormat, string> = {
  markdown: 'md',
  json: 'json',
  csv: 'csv',
}

function downloadReport(report: Report) {
  if (!report.content) return
  const mime =
    report.format === 'json'
      ? 'application/json'
      : report.format === 'csv'
        ? 'text/csv'
        : 'text/markdown'
  const blob = new Blob([report.content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${report.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${
    FORMAT_EXTENSION[report.format]
  }`
  anchor.click()
  URL.revokeObjectURL(url)
}

function demoContent(type: string): string {
  return `# ${humanize(type)} report\n\nGenerated from demo fixtures at ${formatDateTime(
    new Date().toISOString(),
  )}.

- Portfolio is tracking within tolerance
- Two projects carry elevated risk
- No outstanding approvals`
}

export default function ReportsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const reportQuery = useDemoQuery<ReportList>({
    queryKey: REPORT_KEY,
    queryFn: () => reportsApi.list({ limit: 100 }),
    demo: DEMO_REPORT_LIST,
  })

  const scheduleQuery = useDemoQuery<ReportSchedule[]>({
    queryKey: SCHEDULE_KEY,
    queryFn: () => reportsApi.listSchedules(),
    demo: DEMO_REPORT_SCHEDULES,
  })

  const reports = useMemo(() => reportQuery.data?.reports ?? [], [reportQuery.data])
  const schedules = useMemo(() => scheduleQuery.data ?? [], [scheduleQuery.data])

  const stats = useMemo(() => {
    const generated = reports.filter((report) => report.status === 'generated').length
    const failed = reports.filter((report) => report.status === 'failed').length
    const active = schedules.filter((schedule) => schedule.enabled).length
    return { total: reports.length, generated, failed, active }
  }, [reports, schedules])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return reports.filter((report) => {
      if (typeFilter !== 'all' && report.report_type !== typeFilter) return false
      if (!term) return true
      return [report.title, report.report_type, report.generated_by].some((value) =>
        value.toLowerCase().includes(term),
      )
    })
  }, [reports, typeFilter, search])

  const generateForm = useForm<GenerateValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: { report_type: DEMO_REPORT_TYPES[0], format: 'markdown' },
  })

  const scheduleForm = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { report_type: DEMO_REPORT_TYPES[0], interval: 'weekly' },
  })

  const generateMutation = useDemoMutation<Report, GenerateValues>({
    mutationFn: (values) =>
      reportsApi.generate({
        report_type: values.report_type,
        format: values.format,
        generated_by: user?.id,
      }),
    demo: (values, client) => {
      const created: Report = {
        id: `rep-demo-${Date.now()}`,
        report_type: values.report_type,
        title: `${humanize(values.report_type)} — ${new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`,
        status: 'generated',
        format: values.format,
        content: demoContent(values.report_type),
        generated_by: user?.id ?? 'usr-admin',
        created_at: new Date().toISOString(),
        error: null,
      }
      client.setQueryData<ReportList>(REPORT_KEY, (current) =>
        current
          ? { ...current, reports: [created, ...current.reports], total: current.total + 1 }
          : { reports: [created], total: 1, skip: 0, limit: 100 },
      )
      return created
    },
    onSuccess: (report) => {
      success('Report generated', `${report.title} is ready to download.`)
      setGenerateOpen(false)
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() })
    },
    onError: (mutationError) => toastError('Could not generate report', mutationError.message),
  })

  const scheduleMutation = useDemoMutation<ReportSchedule, ScheduleValues>({
    mutationFn: (values) =>
      reportsApi.createSchedule({
        report_type: values.report_type,
        interval: values.interval,
        created_by: user?.id,
      }),
    demo: (values, client) => {
      const created: ReportSchedule = {
        id: `sch-demo-${Date.now()}`,
        report_type: values.report_type,
        interval: values.interval,
        enabled: true,
        created_by: user?.id ?? 'usr-admin',
        created_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + 86_400_000).toISOString(),
      }
      client.setQueryData<ReportSchedule[]>(SCHEDULE_KEY, (current) => [
        created,
        ...(current ?? []),
      ])
      return created
    },
    onSuccess: (schedule) => {
      success('Schedule created', `${humanize(schedule.report_type)} will run ${schedule.interval}.`)
      setScheduleOpen(false)
      scheduleForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() })
    },
    onError: (mutationError) => toastError('Could not create schedule', mutationError.message),
  })

  const tickMutation = useDemoMutation<ReportList, void>({
    mutationFn: () => reportsApi.tickSchedules(),
    demo: (_vars, client) => {
      const currentSchedules = client.getQueryData<ReportSchedule[]>(SCHEDULE_KEY) ?? []
      const enabled = currentSchedules.filter((schedule) => schedule.enabled)
      const created: Report[] = enabled.map((schedule, index) => ({
        id: `rep-tick-${Date.now()}-${index}`,
        report_type: schedule.report_type,
        title: `${humanize(schedule.report_type)} — scheduled run`,
        status: 'generated',
        format: 'markdown',
        content: demoContent(schedule.report_type),
        generated_by: 'scheduler',
        created_at: new Date().toISOString(),
        error: null,
      }))
      client.setQueryData<ReportList>(REPORT_KEY, (current) =>
        current
          ? { ...current, reports: [...created, ...current.reports], total: current.total + created.length }
          : { reports: created, total: created.length, skip: 0, limit: 100 },
      )
      return { reports: created, total: created.length, skip: 0, limit: 100 }
    },
    onSuccess: (result) => {
      success(
        'Schedules processed',
        result.total === 0
          ? 'No enabled schedules were due this run.'
          : `${result.total} report${result.total === 1 ? '' : 's'} generated from the schedule queue.`,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() })
    },
    onError: (mutationError) => toastError('Scheduler run failed', mutationError.message),
  })

  const reportColumns: Column<Report>[] = [
    {
      id: 'title',
      header: 'Report',
      cell: (report) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{report.title}</p>
          <p className="text-2xs text-muted-foreground">
            {humanize(report.report_type)} · {report.generated_by}
          </p>
        </div>
      ),
      sortValue: (report) => report.title,
    },
    {
      id: 'format',
      header: 'Format',
      hideOnMobile: true,
      cell: (report) => <Badge tone="neutral">{report.format.toUpperCase()}</Badge>,
      sortValue: (report) => report.format,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (report) => <StatusBadge status={report.status} />,
      sortValue: (report) => report.status,
    },
    {
      id: 'created',
      header: 'Generated',
      hideOnMobile: true,
      cell: (report) => (
        <span className="text-2xs text-muted-foreground">{formatRelative(report.created_at)}</span>
      ),
      sortValue: (report) => report.created_at,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (report) =>
        report.status === 'failed' ? (
          <span
            className="inline-flex items-center gap-1 text-2xs text-destructive"
            title={report.error ?? 'Generation failed'}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Failed
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadReport(report)}
            disabled={!report.content}
          >
            <Download />
            Download
          </Button>
        ),
    },
  ]

  const scheduleColumns: Column<ReportSchedule>[] = [
    {
      id: 'type',
      header: 'Report type',
      cell: (schedule) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {humanize(schedule.report_type)}
          </p>
          <p className="text-2xs text-muted-foreground">
            created {formatRelative(schedule.created_at)}
          </p>
        </div>
      ),
      sortValue: (schedule) => schedule.report_type,
    },
    {
      id: 'interval',
      header: 'Interval',
      cell: (schedule) => <Badge tone="info">{humanize(schedule.interval)}</Badge>,
      sortValue: (schedule) => schedule.interval,
    },
    {
      id: 'enabled',
      header: 'State',
      cell: (schedule) =>
        schedule.enabled ? (
          <Badge tone="success" dot>
            Enabled
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Paused
          </Badge>
        ),
      sortValue: (schedule) => (schedule.enabled ? 1 : 0),
    },
    {
      id: 'next',
      header: 'Next run',
      hideOnMobile: true,
      cell: (schedule) => (
        <span className="text-2xs text-muted-foreground">
          {schedule.enabled ? formatDateTime(schedule.next_run_at) : '—'}
        </span>
      ),
      sortValue: (schedule) => schedule.next_run_at ?? '',
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Intelligence"
        title="Reports"
        description="Generate operational reports on demand, download them and keep recurring schedules running."
        demo={reportQuery.isDemo || scheduleQuery.isDemo}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => tickMutation.mutate()}
              loading={tickMutation.isPending}
            >
              <Play />
              Run schedules
            </Button>
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus />
              Generate report
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reports"
          value={formatNumber(stats.total)}
          icon={BarChart3}
          hint="All generated artefacts"
        />
        <StatCard
          label="Generated"
          value={formatNumber(stats.generated)}
          icon={CheckCircle2}
          tone="success"
          hint="Ready to download"
        />
        <StatCard
          label="Failed"
          value={formatNumber(stats.failed)}
          icon={AlertTriangle}
          tone={stats.failed > 0 ? 'danger' : 'neutral'}
          hint="Need a re-run"
        />
        <StatCard
          label="Active schedules"
          value={formatNumber(stats.active)}
          icon={CalendarClock}
          tone="info"
          hint={`${schedules.length} configured`}
        />
      </div>

      <DataTable
        data={filtered}
        columns={reportColumns}
        getRowId={(report) => report.id}
        loading={reportQuery.isLoading}
        error={reportQuery.isDemo ? null : reportQuery.error?.message ?? null}
        onRetry={() => void reportQuery.refetch()}
        pageSize={8}
        emptyTitle="No reports match"
        emptyDescription="Generate a report or adjust the filters."
        emptyAction={
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Plus />
            Generate report
          </Button>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <InputWithIcon
              icon={<Search />}
              placeholder="Search report or author…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-64"
              aria-label="Search reports"
            />
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-52"
              aria-label="Filter by report type"
            >
              <option value="all">All report types</option>
              {DEMO_REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanize(type)}
                </option>
              ))}
            </Select>
            <Badge tone="neutral" className="ml-auto">
              {filtered.length} of {reports.length}
            </Badge>
          </div>
        }
      />

      <Card>
        <CardToolbar
          title="Scheduled reports"
          description="Recurring runs executed by the scheduler worker."
          actions={
            <>
              <Badge tone="neutral">{schedules.length} schedules</Badge>
              <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
                <Plus />
                New schedule
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => tickMutation.mutate()}
                loading={tickMutation.isPending}
              >
                <RefreshCw />
                Tick
              </Button>
            </>
          }
        />
        <CardContent>
          <DataTable
            data={schedules}
            columns={scheduleColumns}
            getRowId={(schedule) => schedule.id}
            loading={scheduleQuery.isLoading}
            error={scheduleQuery.isDemo ? null : scheduleQuery.error?.message ?? null}
            onRetry={() => void scheduleQuery.refetch()}
            emptyTitle="No schedules"
            emptyDescription="Create a schedule to generate reports automatically."
            emptyAction={
              <Button size="sm" onClick={() => setScheduleOpen(true)}>
                <Plus />
                New schedule
              </Button>
            }
            dense
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate report"
        description="Choose the report type and the output format."
        footer={
          <>
            <Button variant="ghost" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="generate-form" loading={generateMutation.isPending}>
              Generate
            </Button>
          </>
        }
      >
        <form
          id="generate-form"
          className="space-y-4"
          onSubmit={generateForm.handleSubmit((values) => generateMutation.mutate(values))}
        >
          <Field
            label="Report type"
            htmlFor="report_type"
            error={generateForm.formState.errors.report_type?.message}
          >
            <Select id="report_type" {...generateForm.register('report_type')}>
              {DEMO_REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanize(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Format" htmlFor="report_format" error={generateForm.formState.errors.format?.message}>
            <Select id="report_format" {...generateForm.register('format')}>
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="New schedule"
        description="Recurring runs use the same generator as ad-hoc reports."
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="schedule-form" loading={scheduleMutation.isPending}>
              Create schedule
            </Button>
          </>
        }
      >
        <form
          id="schedule-form"
          className="space-y-4"
          onSubmit={scheduleForm.handleSubmit((values) => scheduleMutation.mutate(values))}
        >
          <Field
            label="Report type"
            htmlFor="schedule_type"
            error={scheduleForm.formState.errors.report_type?.message}
          >
            <Select id="schedule_type" {...scheduleForm.register('report_type')}>
              {DEMO_REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanize(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Interval"
            htmlFor="schedule_interval"
            error={scheduleForm.formState.errors.interval?.message}
          >
            <Select id="schedule_interval" {...scheduleForm.register('interval')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  )
}
