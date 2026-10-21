'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Database,
  FilePlus2,
  RotateCcw,
  ScrollText,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuditLog, AuditLogList, AuditSummary } from '@/lib/api/audit'
import { auditApi } from '@/lib/api/audit'
import { DEMO_AUDIT_LIST, DEMO_AUDIT_SUMMARY } from '@/lib/demo/audit'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/label'
import { Input, InputWithIcon } from '@/components/ui/input'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { cn, formatDateTime, formatNumber, formatRelative } from '@/lib/utils'

const AUDIT_KEY = queryKeys.audit.logs({ scope: 'page', limit: 100 })
const SUMMARY_KEY = queryKeys.audit.summary()

export default function AuditPage() {
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [recordOpen, setRecordOpen] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [retentionDays, setRetentionDays] = useState('365')

  const logsQuery = useDemoQuery<AuditLogList>({
    queryKey: AUDIT_KEY,
    queryFn: () => auditApi.listLogs({ limit: 100 }),
    demo: DEMO_AUDIT_LIST,
  })
  const summaryQuery = useDemoQuery<AuditSummary>({
    queryKey: SUMMARY_KEY,
    queryFn: auditApi.summary,
    demo: DEMO_AUDIT_SUMMARY,
  })

  const logs = useMemo(() => logsQuery.data?.logs ?? [], [logsQuery.data])
  const summary = summaryQuery.data

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  )
  const resourceOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.resource_type))).sort(),
    [logs],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return logs.filter((log) => {
      if (actionFilter && log.action !== actionFilter) return false
      if (resourceFilter && log.resource_type !== resourceFilter) return false
      if (!term) return true
      return [log.actor, log.action, log.resource_type, log.resource_id, log.correlation_id]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [logs, search, actionFilter, resourceFilter])

  const uniqueActors = useMemo(() => new Set(logs.map((log) => log.actor)).size, [logs])

  const recordMutation = useDemoMutation<AuditLog, void>({
    mutationFn: () =>
      auditApi.record({
        actor: 'ui',
        action: 'audit.sample',
        resource_type: 'audit',
        resource_id: '*',
        details: { source: 'audit-page' },
      }),
    demo: (_vars, client) => {
      const entry: AuditLog = {
        id: `audit-local-${Date.now()}`,
        actor: 'demo-operator',
        action: 'audit.sample',
        resource_type: 'audit',
        resource_id: '*',
        details: { source: 'audit-page' },
        ip_address: '127.0.0.1',
        correlation_id: `corr-local-${Date.now().toString(16)}`,
        created_at: new Date().toISOString(),
      }
      client.setQueryData<AuditLogList>(AUDIT_KEY, (current) =>
        current
          ? { ...current, logs: [entry, ...current.logs], total: current.total + 1 }
          : { logs: [entry], total: 1, skip: 0, limit: 100 },
      )
      client.setQueryData<AuditSummary>(SUMMARY_KEY, (current) =>
        current
          ? {
              ...current,
              total: current.total + 1,
              sampled: current.sampled + 1,
              total_logged: current.total_logged + 1,
              by_action: {
                ...current.by_action,
                'audit.sample': (current.by_action['audit.sample'] ?? 0) + 1,
              },
            }
          : current,
      )
      return entry
    },
    onSuccess: () => {
      setRecordOpen(false)
      success('Sample entry recorded', 'A synthetic audit entry was added to the stream.')
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all() })
    },
    onError: (mutationError) => {
      toastError('Could not record entry', mutationError.message)
    },
  })

  const purgeMutation = useDemoMutation<{ purged: number }, { retentionDays: number }>({
    mutationFn: ({ retentionDays: days }) => auditApi.purge(days),
    demo: ({ retentionDays: days }, client) => {
      const cutoff = Date.now() - days * 86_400_000
      let purged = 0
      client.setQueryData<AuditLogList>(AUDIT_KEY, (current) => {
        if (!current) return current
        const kept = current.logs.filter(
          (log) => new Date(log.created_at).getTime() >= cutoff,
        )
        purged = current.logs.length - kept.length
        return {
          ...current,
          logs: kept,
          total: Math.max(0, current.total - purged),
        }
      })
      client.setQueryData<AuditSummary>(SUMMARY_KEY, (current) =>
        current
          ? {
              ...current,
              total: Math.max(0, current.total - purged),
              sampled: Math.max(0, current.sampled - purged),
              total_logged: Math.max(0, current.total_logged - purged),
            }
          : current,
      )
      return { purged }
    },
    onSuccess: ({ purged }) => {
      setPurgeOpen(false)
      success('Audit purge complete', `${purged} entries removed.`)
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all() })
    },
    onError: (mutationError) => {
      toastError('Purge failed', mutationError.message)
    },
  })

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetFilters = () => {
    setSearch('')
    setActionFilter('')
    setResourceFilter('')
  }

  const retention = Math.max(0, Number(retentionDays) || 0)
  const hasFilters = Boolean(search || actionFilter || resourceFilter)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Audit log"
        description="Immutable trail of platform activity. Expand any entry to inspect the full JSON payload, correlation id and network metadata."
        demo={logsQuery.isDemo || summaryQuery.isDemo}
        actions={
          <>
            <Button variant="outline" onClick={() => setRecordOpen(true)}>
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
              Record sample
            </Button>
            <Button variant="destructive" onClick={() => setPurgeOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Purge expired
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total logged"
          value={summary ? formatNumber(summary.total_logged) : '—'}
          hint="All-time audit entries"
          icon={Database}
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Sampled entries"
          value={summary ? formatNumber(summary.sampled) : '—'}
          hint="Available in this view"
          icon={ScrollText}
          tone="info"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Distinct actions"
          value={summary ? formatNumber(Object.keys(summary.by_action).length) : '—'}
          hint={summary ? `${Object.keys(summary.by_resource).length} resource types` : undefined}
          icon={Activity}
          tone="success"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Actors"
          value={formatNumber(uniqueActors)}
          hint="Unique identities in the stream"
          icon={Users}
          tone="warning"
        />
      </div>

      <Card>
        <CardToolbar
          title="Audit stream"
          description={`${filtered.length} of ${logs.length} entries shown.`}
          actions={
            <div className="flex items-center gap-2">
              <Badge tone="outline">
                <ScrollText className="h-3 w-3" aria-hidden="true" />
                Append-only
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                disabled={!hasFilters}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset filters
              </Button>
            </div>
          }
        />
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 pb-4">
            <InputWithIcon
              icon={<Search />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search actor, action, resource or correlation id"
              aria-label="Search audit entries"
              className="w-full sm:w-80"
            />
            <Select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              aria-label="Filter by action"
              className="w-full sm:w-56"
            >
              <option value="">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Select>
            <Select
              value={resourceFilter}
              onChange={(event) => setResourceFilter(event.target.value)}
              aria-label="Filter by resource type"
              className="w-full sm:w-48"
            >
              <option value="">All resources</option>
              {resourceOptions.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </Select>
          </div>

          {logsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={logs.length === 0 ? 'No audit entries yet' : 'No entries match the filters'}
              description={
                logs.length === 0
                  ? 'Platform activity will appear here as soon as it is recorded.'
                  : 'Try a different search term or reset the filters.'
              }
              compact
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Audit log entries</caption>
                <thead className="border-b border-border bg-muted/30 text-2xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-10 px-2 py-2">
                      <span className="sr-only">Expand</span>
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">When</th>
                    <th scope="col" className="px-3 py-2 font-medium">Actor</th>
                    <th scope="col" className="px-3 py-2 font-medium">Action</th>
                    <th scope="col" className="px-3 py-2 font-medium">Resource</th>
                    <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">IP</th>
                    <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const isExpanded = expanded.has(log.id)
                    return (
                      <AuditRow
                        key={log.id}
                        log={log}
                        expanded={isExpanded}
                        onToggle={() => toggleExpanded(log.id)}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-2xs text-muted-foreground">
            Audit entries are append-only. Purges remove entries older than the retention window
            and are themselves recorded in the stream.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onConfirm={() => recordMutation.mutate()}
        title="Record a sample audit entry?"
        description="This writes a synthetic audit.sample entry through the audit API. In demo mode the entry is added to the local cache only."
        confirmLabel="Record entry"
        loading={recordMutation.isPending}
      />

      <Modal
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        title="Purge expired audit entries"
        description="Entries created before the retention window are permanently removed. This action cannot be undone."
        size="sm"
        closeOnOverlayClick={!purgeMutation.isPending}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPurgeOpen(false)}
              disabled={purgeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => purgeMutation.mutate({ retentionDays: retention })}
              loading={purgeMutation.isPending}
            >
              Purge entries
            </Button>
          </>
        }
      >
        <Field
          label="Retention window (days)"
          htmlFor="retention-days"
          hint="Use 0 to purge every entry in the stream. Demo mode removes matching cached entries."
          required
        >
          <Input
            id="retention-days"
            type="number"
            min={0}
            value={retentionDays}
            onChange={(event) => setRetentionDays(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  )
}

function AuditRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog
  expanded: boolean
  onToggle: () => void
}) {
  const details = JSON.stringify(log.details ?? {}, null, 2)
  const detailsId = `audit-details-${log.id}`

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20',
          expanded && 'bg-muted/20',
        )}
      >
        <td className="px-2 py-2 align-top">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={expanded ? `Collapse ${log.action}` : `Expand ${log.action}`}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </td>
        <td className="px-3 py-2 align-top">
          <span className="tabular text-muted-foreground" title={formatDateTime(log.created_at)}>
            {formatRelative(log.created_at)}
          </span>
        </td>
        <td className="px-3 py-2 align-top font-medium text-foreground">{log.actor}</td>
        <td className="px-3 py-2 align-top">
          <span className="font-mono text-2xs text-primary">{log.action}</span>
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground">{log.resource_type}</span>
            <span className="font-mono text-2xs text-muted-foreground">
              {log.resource_id || '—'}
            </span>
          </div>
        </td>
        <td className="hidden px-3 py-2 align-top font-mono text-2xs text-muted-foreground md:table-cell">
          {log.ip_address}
        </td>
        <td className="hidden max-w-[180px] truncate px-3 py-2 align-top font-mono text-2xs text-muted-foreground lg:table-cell">
          {log.correlation_id}
        </td>
      </tr>
      {expanded ? (
        <tr id={detailsId} className="border-b border-border/60 bg-muted/20 last:border-0">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <p className="mb-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Details payload
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background/80 p-3 font-mono text-2xs leading-relaxed text-foreground">
                  {details}
                </pre>
              </div>
              <dl className="space-y-2 text-2xs">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Logged at</dt>
                  <dd className="tabular text-foreground">{formatDateTime(log.created_at)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Actor</dt>
                  <dd className="text-foreground">{log.actor}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">IP address</dt>
                  <dd className="font-mono text-foreground">{log.ip_address}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Correlation</dt>
                  <dd className="truncate font-mono text-foreground" title={log.correlation_id}>
                    {log.correlation_id}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Entry id</dt>
                  <dd className="truncate font-mono text-foreground" title={log.id}>
                    {log.id}
                  </dd>
                </div>
              </dl>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
