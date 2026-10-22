import { clamp, cn } from '@/lib/utils'

/**
 * Confidence interval strip: a track from `low` to `high` with a marker at the
 * point estimate. Used by cost and demand forecast tables.
 */
export function ConfidenceRange({
  low,
  high,
  value,
  formatter,
  className,
}: {
  low: number | null | undefined
  high: number | null | undefined
  value: number | null | undefined
  formatter: (value: number) => string
  className?: string
}) {
  const lowValue = typeof low === 'number' ? low : 0
  const highValue = typeof high === 'number' ? high : lowValue
  const pointValue = typeof value === 'number' ? value : lowValue
  const span = highValue - lowValue
  const pct = span > 0 ? clamp(((pointValue - lowValue) / span) * 100, 0, 100) : 50

  return (
    <div className={cn('min-w-[150px] max-w-[200px] space-y-1', className)}>
      <div
        className="relative h-1.5 rounded-full bg-muted"
        role="img"
        aria-label={`Range ${formatter(lowValue)} to ${formatter(highValue)}, estimate ${formatter(pointValue)}`}
      >
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-primary/20" />
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
          style={{ left: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] tabular text-muted-foreground">
        <span>{formatter(lowValue)}</span>
        <span>{formatter(highValue)}</span>
      </div>
    </div>
  )
}
