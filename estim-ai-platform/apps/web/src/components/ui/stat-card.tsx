import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn, formatDelta } from '@/lib/utils'
import { Skeleton } from './skeleton'

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneClasses: Record<StatTone, string> = {
  primary: 'border-primary/25 bg-primary-muted text-primary',
  success: 'border-success/25 bg-success-muted text-success',
  warning: 'border-warning/25 bg-warning-muted text-warning',
  danger: 'border-destructive/25 bg-destructive-muted text-destructive',
  info: 'border-info/25 bg-info-muted text-info',
  neutral: 'border-border bg-muted text-muted-foreground',
}

type StatCardProps = {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  tone?: StatTone
  /** Fractional change, e.g. 0.042 for +4.2%. */
  delta?: number | null
  /** Explains what the delta measures, e.g. "vs last week". */
  deltaLabel?: string
  /** When true, a positive delta is bad (e.g. cost overrun). */
  invertDelta?: boolean
  hint?: React.ReactNode
  sparkline?: React.ReactNode
  loading?: boolean
  href?: string
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  delta,
  deltaLabel,
  invertDelta = false,
  hint,
  sparkline,
  loading = false,
  href,
  className,
}: StatCardProps) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta)
  const positive = hasDelta && delta !== 0 ? (invertDelta ? delta < 0 : delta > 0) : null
  const DeltaIcon = !hasDelta || delta === 0 ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span className={cn('grid h-7 w-7 place-items-center rounded-lg border', toneClasses[tone])}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <p className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        </div>
        {href ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className="mt-2.5 text-2xl font-semibold leading-none tracking-tight tabular text-foreground">
          {value}
        </p>
      )}

      <div className="mt-2.5 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1">
        {hasDelta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-2xs font-medium tabular',
              positive === null && 'bg-muted text-muted-foreground',
              positive === true && 'bg-success-muted text-success',
              positive === false && 'bg-destructive-muted text-destructive',
            )}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden="true" />
            {formatDelta(delta)}
          </span>
        ) : null}
        {deltaLabel ? <span className="text-2xs text-muted-foreground">{deltaLabel}</span> : null}
        {hint ? <span className="text-2xs text-muted-foreground">{hint}</span> : null}
      </div>

      {sparkline ? <div className="mt-3 h-10">{sparkline}</div> : null}
    </>
  )

  const classes = cn(
    'group relative rounded-xl border border-border bg-card p-4 shadow-card transition-colors',
    href && 'hover:border-primary/40 hover:bg-accent/40',
    className,
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
