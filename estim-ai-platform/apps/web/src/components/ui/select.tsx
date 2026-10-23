'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-lg border border-input bg-surface pl-3 pr-8 text-sm text-foreground shadow-xs transition-colors',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
})
