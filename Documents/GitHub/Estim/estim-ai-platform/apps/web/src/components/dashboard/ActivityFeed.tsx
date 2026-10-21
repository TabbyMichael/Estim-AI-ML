'use client'

import Link from 'next/link'
import { ArrowRight, History, RefreshCw } from 'lucide-react'
import type { AuditLog } from '@/lib/api/audit'
import { DEMO_USERS } from '@/lib/demo/people'
import { cn, formatRelative, humanize } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardFooter } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

const ACTOR_NAMES = new Map(DEMO_USERS.map((user) => [user.id, user.full_name]))

/** `procurement.anomaly.review` → `Procurement anomaly review`. */
function humanizeAction(action: string): string {
  return action
    .split('.')
    .filter(Boolean)
    .map((part) => humanize(part))
    .join(' ')
}

export function ActivityFeed({
  logs,
  loading = false,
  error = false,
  onRetry,
  className,
}: {
  logs: AuditLog[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="p-5 pb-3">
        <h2 className="text-[15px] font-semibold leading-tight tracking-tight">Recent activity</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Latest changes from the audit trail.</p>
      </div>

      <div className="flex-1 px-5">
        {loading ? (
          <ul className="space-y-4" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="flex gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <EmptyState
            icon={RefreshCw}
            title="Activity unavailable"
            description="The audit trail could not be loaded. It will recover automatically."
            compact
            action={
              onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-2xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Try again
                </button>
              ) : null
            }
          />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Actions across the platform will appear here."
            compact
          />
        ) : (
          <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-border">
            {logs.map((log) => {
              const actor = ACTOR_NAMES.get(log.actor) ?? log.actor
              return (
                <li key={log.id} className="relative flex items-start gap-3">
                  <Avatar name={actor} size="xs" className="ring-2 ring-card" />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs leading-5 text-foreground">
                      <span className="font-medium">{actor}</span>{' '}
                      <span className="text-muted-foreground">{humanizeAction(log.action)}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-muted-foreground">
                      <span className="font-mono text-[10px] text-foreground/70">{log.resource_type}</span>
                      <span className="tabular">{formatRelative(log.created_at)}</span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <CardFooter className="mt-4 justify-between">
        <p className="text-2xs text-muted-foreground">Immutable audit trail</p>
        <Link
          href="/audit"
          className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View audit log
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
