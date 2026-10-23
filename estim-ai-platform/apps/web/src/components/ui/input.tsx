'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-input bg-surface px-3 py-1 text-sm text-foreground shadow-xs transition-colors',
        'placeholder:text-muted-foreground/70',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20',
        'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
})

export type InputWithIconProps = InputProps & {
  icon?: React.ReactNode
  trailing?: React.ReactNode
  inputClassName?: string
}

/** Input with a leading icon and optional trailing slot. */
export const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  function InputWithIcon({ icon, trailing, className, inputClassName, ...props }, ref) {
    return (
      <div className={cn('relative', className)}>
        {icon ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
        <Input ref={ref} className={cn(icon && 'pl-8', trailing && 'pr-9', inputClassName)} {...props} />
        {trailing ? (
          <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
    )
  },
)
