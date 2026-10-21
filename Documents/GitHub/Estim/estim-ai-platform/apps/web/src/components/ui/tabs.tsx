'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabItem = {
  id: string
  label: React.ReactNode
  icon?: LucideIcon
  badge?: React.ReactNode
  disabled?: boolean
}

type TabsProps = {
  items: TabItem[]
  value: string
  onValueChange: (id: string) => void
  className?: string
  /** Underline style for page-level tabs, pill style for inline filters. */
  variant?: 'underline' | 'pill'
  'aria-label'?: string
}

export function Tabs({
  items,
  value,
  onValueChange,
  className,
  variant = 'underline',
  ...aria
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label']}
      className={cn(
        variant === 'underline'
          ? 'flex gap-1 overflow-x-auto border-b border-border scrollbar-none'
          : 'inline-flex items-center gap-1 rounded-lg bg-muted p-1',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === value
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            disabled={item.disabled}
            onClick={() => onValueChange(item.id)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
              variant === 'underline'
                ? cn(
                    '-mb-px border-b-2 px-3 py-2.5',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                : cn(
                    'rounded-md px-3 py-1.5',
                    isActive
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  ),
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {item.label}
            {item.badge !== undefined && item.badge !== null ? (
              <span className="rounded bg-muted px-1 text-[10px] font-semibold tabular text-muted-foreground">
                {item.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function TabsPanel({
  id,
  active,
  children,
  className,
}: {
  id: string
  active: string
  children: React.ReactNode
  className?: string
}) {
  if (id !== active) return null
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className={className}>
      {children}
    </div>
  )
}
