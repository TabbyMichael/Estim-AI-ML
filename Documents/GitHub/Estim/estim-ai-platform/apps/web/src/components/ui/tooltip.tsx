import { cn } from '@/lib/utils'

type TooltipProps = {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const sideClasses = {
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
  left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
  right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
}

/**
 * CSS-only tooltip: shows on hover and keyboard focus of the wrapped element.
 * Keep labels short; long-form help belongs in a description line instead.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-max max-w-[16rem] rounded-md border border-border bg-popover px-2 py-1 text-2xs leading-4 text-popover-foreground opacity-0 shadow-elevated transition-opacity duration-150',
          'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          sideClasses[side],
        )}
      >
        {content}
      </span>
    </span>
  )
}
