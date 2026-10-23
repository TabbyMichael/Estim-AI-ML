import { cn, clamp } from '@/lib/utils'

type ProgressProps = {
  value: number | null | undefined
  max?: number
  className?: string
  barClassName?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'default'
  label?: string
}

const toneClasses = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
}

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  tone = 'primary',
  size = 'default',
  label,
}: ProgressProps) {
  const pct = value === null || value === undefined ? 0 : clamp((value / max) * 100, 0, 100)

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-muted', size === 'sm' ? 'h-1.5' : 'h-2', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-smooth', toneClasses[tone], barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Progress bar with a label row, used in milestone and risk lists. */
export function ProgressRow({
  label,
  value,
  max = 100,
  hint,
  tone,
}: {
  label: React.ReactNode
  value: number | null | undefined
  max?: number
  hint?: React.ReactNode
  tone?: ProgressProps['tone']
}) {
  const pct = value === null || value === undefined ? 0 : clamp((value / max) * 100, 0, 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-medium text-foreground">{label}</span>
        <span className="tabular text-muted-foreground">{hint ?? `${Math.round(pct)}%`}</span>
      </div>
      <Progress value={pct} tone={tone} size="sm" label={typeof label === 'string' ? label : undefined} />
    </div>
  )
}
