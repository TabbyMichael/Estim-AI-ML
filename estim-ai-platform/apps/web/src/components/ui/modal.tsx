'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
  /** Set to false for destructive confirmations that require an explicit choice. */
  closeOnOverlayClick?: boolean
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const returnFocusRef = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => setMounted(true), [])

  // Escape closes, Tab is trapped inside the panel.
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Lock body scroll, focus the first control while open and restore focus
  // to the trigger on close.
  React.useEffect(() => {
    if (!open) return
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const node = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      node?.focus()
    }, 30)
    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
      returnFocusRef.current?.focus()
    }
  }, [open])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-[hsl(230_40%_4%_/_0.7)] backdrop-blur-[2px] animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-10 my-auto w-full animate-slide-up overflow-hidden rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-elevated sm:rounded-xl',
          sizeClasses[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0 space-y-1">
              {title ? (
                <h2 id={titleId} className="text-[15px] font-semibold leading-tight">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 shrink-0"
            >
              <X />
            </Button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/** Confirmation dialog with destructive styling, used for purge/delete flows. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
