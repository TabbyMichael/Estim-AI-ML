'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SegmentedOption<TValue extends string = string> = {
  value: TValue
  label: React.ReactNode
  icon?: LucideIcon
}

type SegmentedControlProps<TValue extends string = string> = {
  options: SegmentedOption<TValue>[]
  value: TValue
  onValueChange: (value: TValue) => void
  size?: 'sm' | 'default'
  className?: string
  'aria-label'?: string
}

export function SegmentedControl<TValue extends string = string>({
  options,
  value,
  onValueChange,
  size = 'default',
  className,
  ...aria
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="group"
      aria-label={aria['aria-label']}
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              size === 'sm' ? 'h-7 px-2 text-2xs' : 'h-8 px-3 text-xs',
              isActive
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
