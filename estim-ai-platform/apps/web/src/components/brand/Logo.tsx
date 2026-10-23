import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  /** Hide the "Estim AI" wordmark and render the mark only. */
  compact?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const markSizes = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-6 w-6',
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-[15px]',
  lg: 'text-lg',
}

export function Logo({ className, compact = false, size = 'md' }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative grid shrink-0 place-items-center bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-glow',
          markSizes[size],
        )}
        aria-hidden="true"
      >
        <Layers className={iconSizes[size]} strokeWidth={2.2} />
        <span className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/20" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn('font-semibold tracking-tight text-foreground', textSizes[size])}>
            Estim<span className="text-primary"> AI</span>
          </span>
          <span className="mt-1 text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Construction Intelligence
          </span>
        </span>
      )}
    </span>
  )
}
