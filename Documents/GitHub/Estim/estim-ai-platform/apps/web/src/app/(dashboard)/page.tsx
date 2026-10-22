'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardToolbar } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { ModuleCard } from '@/components/dashboard/ModuleCard'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { SystemStatus } from '@/components/dashboard/SystemStatus'
import {
  ChartLegend,
  HealthRing,
  SpendForecastChart,
  Sparkline,
  chartColor,
  type RingSegment,
} from '@/components/charts/overview'

import { MODULES, QUICK_LINKS } from '@/config/modules'
import { useAuth } from '@/lib/auth-context'
import { useRealtime } from '@/lib/realtime-context'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { queryKeys } from '@/lib/query-keys'
import { auditApi, type AuditLogList } from '@/lib/api/audit'
import {
  DEMO_ACTIVITY_LIST,
  DEMO_ALERTS,
  KPI_SPARKLINES,
  portfolioKpis,
} from '@/lib/demo/dashboard'
import {
  DEMO_HEALTH_DISTRIBUTION,
  DEMO_MILESTONES,
  DEMO_SPEND_SERIES,
} from '@/lib/demo/projects'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'

const HEALTH_TONES: RingSegment[] = DEMO_HEALTH_DISTRIBUTION.map((segment) => ({
  label: segment.name,
  value: segment.value,
  tone: segment.tone,
}))

export default function DashboardPage() {
  const { user, isDemoSession } = useAuth()
  const { state: realtimeState } = useRealtime()

  // Mount-only clock so SSR markup never disagrees with the client.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const auditQuery = useDemoQuery<AuditLogList>({
    queryKey: queryKeys.audit.logs({ limit: 8, scope: 'dashboard' }),
    queryFn: () => auditApi.listLogs({ limit: 8 }),
    demo: DEMO_ACTIVITY_LIST,
  })

  const kpis = useMemo(() => portfolioKpis(), [])
  const spendTotals = useMemo(
    () => ({
      actual: DEMO_SPEND_SERIES.reduce((sum, point) => sum + (point.actual ?? 0), 0) * 1_000_000,
      forecast: DEMO_SPEND_SERIES.reduce((sum, point) => sum + point.forecast, 0) * 1_000_000,
    }),
    [],
  )

  const milestoneStats = useMemo(() => {
    const milestones = Object.values(DEMO_MILESTONES).flat()
    const completed = milestones.filter((milestone) => milestone.status === 'completed').length
    const inProgress = milestones.filter((milestone) => milestone.status === 'in_progress').length
    const overdue = milestones.filter(
      (milestone) =>
        milestone.status !== 'completed' && new Date(milestone.planned_end).getTime() < Date.now(),
    ).length
    return { total: milestones.length, completed, inProgress, overdue }
  }, [])

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'
  const hour = now?.getHours() ?? null
  const greeting =
    hour === null ? 'Welcome back' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const demo = isDemoSession || auditQuery.isDemo
  const apiState = auditQuery.isDemo ? 'demo' : auditQuery.isError ? 'error' : 'ok'
  const lastSync = now ? '12 minutes ago' : '—'

  const atRiskCount = kpis.atRisk + kpis.delayed

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations overview"
        title={`${greeting}, ${firstName}`}
        description={
          now
            ? `${formatDate(now, 'EEEE, MMMM d, yyyy')} — ${kpis.active} active projects, ${formatCurrency(
                kpis.budget,
                { compact: true, maximumFractionDigits: 1 },
              )} under management.`
            : 'Portfolio health, spend and risk in one place.'
        }
        demo={demo}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports">
                <FileText />
                Generate report
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/notifications">
                <Bell />
                Review alerts
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <section aria-label="Key performance indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active projects"
          value={kpis.active}
          icon={LayoutDashboard}
          tone="primary"
          delta={0.2}
          deltaLabel="vs last quarter"
          hint={`${formatCurrency(kpis.remaining, { compact: true, maximumFractionDigits: 1 })} budget left`}
          sparkline={<Sparkline tone="primary" values={KPI_SPARKLINES.activeProjects} />}
          href="/gantt"
        />
        <StatCard
          label="On track"
          value={`${kpis.onTrackPct}%`}
          icon={CheckCircle2}
          tone="success"
          delta={0.042}
          deltaLabel="vs last week"
          hint={`${kpis.onTrack} of ${kpis.active} projects`}
          sparkline={<Sparkline tone="success" values={KPI_SPARKLINES.onTrack} />}
          href="/project-risk"
        />
        <StatCard
          label="At risk"
          value={atRiskCount}
          icon={ShieldAlert}
          tone="warning"
          delta={-0.25}
          invertDelta
          deltaLabel="vs last week"
          hint={`${kpis.delayed} already delayed`}
          sparkline={<Sparkline tone="warning" values={KPI_SPARKLINES.atRisk} />}
          href="/project-risk"
        />
        <StatCard
          label="Open alerts"
          value={DEMO_ALERTS.length}
          icon={Bell}
          tone="danger"
          delta={0.167}
          invertDelta
          deltaLabel="vs last week"
          hint={`${DEMO_ALERTS.filter((alert) => alert.severity === 'critical').length} critical`}
          sparkline={<Sparkline tone="danger" values={KPI_SPARKLINES.alerts} />}
          href="/notifications"
        />
      </section>

      {/* Charts row */}
      <section aria-label="Portfolio analytics" className="grid gap-4 xl:grid-cols-3">
        <Card className="flex flex-col xl:col-span-2">
          <CardToolbar
            title="Spend vs forecast"
            description="Monthly committed spend against the approved cost forecast."
            actions={
              <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                Apr – Dec 2026
              </span>
            }
          />
          <CardContent className="pb-2">
            <SpendForecastChart data={DEMO_SPEND_SERIES} />
          </CardContent>
          <CardFooter className="mt-auto flex-wrap justify-between gap-3">
            <ChartLegend
              items={[
                { label: 'Actual', tone: 'primary' },
                { label: 'Forecast', tone: 'violet', dashed: true },
              ]}
            />
            <div className="flex items-center gap-4 text-2xs text-muted-foreground">
              <span>
                Committed{' '}
                <span className="font-semibold tabular text-foreground">
                  {formatCurrency(spendTotals.actual, { compact: true, maximumFractionDigits: 1 })}
                </span>
              </span>
              <span>
                Forecast{' '}
                <span className="font-semibold tabular text-foreground">
                  {formatCurrency(spendTotals.forecast, { compact: true, maximumFractionDigits: 1 })}
                </span>
              </span>
            </div>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Project health"
            description="Status mix across the active portfolio."
            actions={
              <Link
                href="/project-risk"
                className="text-2xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open risk
              </Link>
            }
          />
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-5 pb-3 sm:flex-row xl:flex-col">
            <HealthRing
              segments={HEALTH_TONES}
              value={`${kpis.onTrackPct}%`}
              label="on track"
            />
            <ul className="w-full space-y-2">
              {HEALTH_TONES.map((segment) => (
                <li key={segment.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColor(segment.tone) }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-muted-foreground">{segment.label}</span>
                  <span className="tabular font-medium text-foreground">{segment.value}</span>
                  <span className="w-10 text-right tabular text-2xs text-muted-foreground">
                    {formatPercent(segment.value / kpis.active, { digits: 0 })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex-wrap gap-x-4 gap-y-1">
            <span className="text-2xs text-muted-foreground">
              <span className="font-semibold tabular text-foreground">{milestoneStats.completed}</span>
              /{milestoneStats.total} milestones done
            </span>
            <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
              <Clock className="h-3 w-3 text-info" aria-hidden="true" />
              <span className="font-semibold tabular text-foreground">{milestoneStats.inProgress}</span> in
              progress
            </span>
            {milestoneStats.overdue > 0 ? (
              <span className="inline-flex items-center gap-1 text-2xs text-warning">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                <span className="font-semibold tabular">{milestoneStats.overdue}</span> overdue
              </span>
            ) : null}
          </CardFooter>
        </Card>
      </section>

      {/* Alerts + activity */}
      <section aria-label="Alerts and activity" className="grid gap-4 xl:grid-cols-3">
        <AlertsPanel alerts={DEMO_ALERTS} className="xl:col-span-2" />
        <ActivityFeed
          logs={auditQuery.data?.logs ?? []}
          loading={auditQuery.isLoading}
          error={auditQuery.isError}
          onRetry={() => void auditQuery.refetch()}
        />
      </section>

      {/* Modules */}
      <section aria-labelledby="modules-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="modules-heading" className="text-base font-semibold tracking-tight text-foreground">
              AI modules
            </h2>
            <p className="text-xs text-muted-foreground">
              Seven models watching cost, quality, inventory and schedule.
            </p>
          </div>
          <Link
            href="/charts"
            className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Explore analytics
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-foreground">{link.title}</span>
                  <span className="block text-2xs text-muted-foreground">{link.description}</span>
                </span>
                <ArrowUpRight
                  className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>

      <SystemStatus apiState={apiState} realtime={realtimeState} lastSync={lastSync} />
    </div>
  )
}
