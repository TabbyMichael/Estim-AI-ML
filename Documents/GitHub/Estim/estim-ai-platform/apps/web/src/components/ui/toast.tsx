'use client'

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export type ToastItem = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

const variantStyles: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  default: { icon: Info, className: 'border-border text-foreground' },
  success: { icon: CheckCircle2, className: 'border-success/30 text-success' },
  error: { icon: XCircle, className: 'border-destructive/30 text-destructive' },
  warning: { icon: AlertTriangle, className: 'border-warning/30 text-warning' },
  info: { icon: Info, className: 'border-info/30 text-info' },
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => {
        const variant = toast.variant ?? 'default'
        const { icon: Icon, className } = variantStyles[variant]
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-popover p-3 shadow-elevated animate-slide-up',
              className,
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-5 text-foreground">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
