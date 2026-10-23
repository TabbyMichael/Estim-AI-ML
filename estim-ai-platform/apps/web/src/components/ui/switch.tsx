'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  size?: 'sm' | 'default'
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  className,
  size = 'default',
  ...aria
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
        checked ? 'bg-primary' : 'bg-input',
        className,
      )}
      {...aria}
    >
      <span
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-sm transition-transform duration-200',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          checked ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

/** Switch with an inline label and optional description, used in settings lists. */
export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
