'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import type { AlertSeverity, DemoAlert } from '@/lib/demo/dashboard'
import { cn, formatRelative } from '@/lib/utils'
import { Card, CardFooter } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

const SEVERITY = {
  critical: {
    label: 'Critical',
    icon: ShieldAlert,
    dot: 'bg-destructive',
    iconClass: 'text-destructive',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    dot: 'bg-warning',
    iconClass: 'text-warning',
  },
  info: {
    label: 'Informational',
    icon: Info,
    dot: 'bg-info',
    iconClass: 'text-info',
  },
} as const

const ORDER: AlertSeverity[] = ['critical', 'warning', 'info']

/** Severity-grouped operational alerts with deep links into each module. */
export function AlertsPanel({
  alerts,
  className,
}: {
  alerts: DemoAlert[]
  className?: string
}) {
  const grouped = ORDER.map((severity) => ({
    severity,
    items: alerts.filter((alert) => alert.severity === severity),
  })).filter((group) => group.items.length > 0)

  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 p-5 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight">Open alerts</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {alerts.length} signals need a decision across the portfolio.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive-muted px-1.5 py-0.5 text-2xs font-medium text-destructive">
          {alerts.filter((alert) => alert.severity === 'critical').length} critical
        </span>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No open alerts"
          description="Every module is within tolerance right now."
          compact
          className="mx-5 mb-5"
        />
      ) : (
        <div className="divide-y divide-border/60 border-y border-border/60">
          {grouped.map((group) => {
            const meta = SEVERITY[group.severity]
            const Icon = meta.icon
            return (
              <section key={group.severity} aria-label={`${meta.label} alerts`}>
                <div className="flex items-center gap-2 bg-muted/30 px-5 py-1.5">
                  <Icon className={cn('h-3 w-3', meta.iconClass)} aria-hidden="true" />
                  <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {meta.label}
                  </p>
                  <span className="text-2xs tabular text-muted-foreground/70">{group.items.length}</span>
                </div>
                <ul className="divide-y divide-border/40">
                  {group.items.map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={alert.href}
                        className="group flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span
                          className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <span className="text-xs font-medium leading-5 text-foreground">
                              {alert.title}
                            </span>
                            <span className="text-2xs tabular text-muted-foreground">
                              {formatRelative(alert.created_at)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-2xs leading-relaxed text-muted-foreground">
                            {alert.detail}
                          </span>
                        </span>
                        <span className="mt-0.5 shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {alert.module}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <CardFooter className="mt-auto justify-between">
        <p className="text-2xs text-muted-foreground">Source: every AI module, refreshed hourly.</p>
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Notification centre
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
