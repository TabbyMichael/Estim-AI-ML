'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, humanize } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-2xs font-medium leading-4 transition-colors [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-muted text-muted-foreground',
        primary: 'border-primary/25 bg-primary-muted text-primary',
        success: 'border-success/25 bg-success-muted text-success',
        warning: 'border-warning/25 bg-warning-muted text-warning',
        danger: 'border-destructive/25 bg-destructive-muted text-destructive',
        info: 'border-info/25 bg-info-muted text-info',
        outline: 'border-border bg-transparent text-foreground',
      },
      size: {
        sm: 'px-1.5 py-0 text-[10px]',
        default: '',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Render a leading status dot. */
  dot?: boolean
}

const dotColor: Record<string, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  outline: 'bg-foreground',
}

export function Badge({ className, tone = 'neutral', size, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor[tone ?? 'neutral'])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

type Tone = NonNullable<BadgeProps['tone']>

const STATUS_TONES: Record<string, Tone> = {
  // success-ish
  active: 'success',
  approved: 'success',
  completed: 'success',
  complete: 'success',
  connected: 'success',
  done: 'success',
  generated: 'success',
  healthy: 'success',
  indexed: 'success',
  on_track: 'success',
  passed: 'success',
  processed: 'success',
  read: 'success',
  resolved: 'success',
  sent: 'success',
  success: 'success',
  valid: 'success',
  // warning-ish
  pending: 'warning',
  queued: 'warning',
  review: 'warning',
  submitted: 'warning',
  scheduled: 'warning',
  stale: 'warning',
  under_investigation: 'warning',
  waiting: 'warning',
  medium: 'warning',
  elevated: 'warning',
  // danger-ish
  rejected: 'danger',
  failed: 'danger',
  failure: 'danger',
  error: 'danger',
  high: 'danger',
  critical: 'danger',
  offline: 'danger',
  overdue: 'danger',
  blocked: 'danger',
  unreachable: 'danger',
  // info-ish
  draft: 'info',
  in_progress: 'info',
  processing: 'info',
  superseded: 'neutral',
  low: 'success',
  info: 'info',
  // neutral
  inactive: 'neutral',
  disabled: 'neutral',
  archived: 'neutral',
  cancelled: 'neutral',
  unknown: 'neutral',
}

/** Maps an API status string onto a semantic tone. */
export function statusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral'
  return STATUS_TONES[status.toLowerCase()] ?? 'neutral'
}

export function StatusBadge({
  status,
  className,
  dot = true,
  label,
}: {
  status: string | null | undefined
  className?: string
  dot?: boolean
  label?: string
}) {
  return (
    <Badge tone={statusTone(status)} dot={dot} className={className}>
      {label ?? humanize(status)}
    </Badge>
  )
}

export function RiskBadge({ level }: { level: string | null | undefined }) {
  return (
    <Badge tone={statusTone(level)} dot>
      {humanize(level)}
    </Badge>
  )
}
