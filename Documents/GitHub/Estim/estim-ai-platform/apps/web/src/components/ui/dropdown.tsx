'use client'

import * as React from 'react'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import { cn } from '@/lib/utils'

export type DropdownItem = {
  id: string
  label: React.ReactNode
  icon?: React.ReactNode
  description?: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  /** Render a divider above this item. */
  separatorBefore?: boolean
}

type DropdownProps = {
  trigger: React.ReactElement<Record<string, unknown>>
  items: DropdownItem[]
  align?: 'start' | 'end'
  className?: string
  menuClassName?: string
}

export function Dropdown({ trigger, items, align = 'end', className, menuClassName }: DropdownProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  const triggerElement = React.cloneElement(trigger, {
    onClick: (event: React.MouseEvent) => {
      const original = trigger.props.onClick as ((event: React.MouseEvent) => void) | undefined
      original?.(event)
      setOpen((value) => !value)
    },
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  })

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {triggerElement}
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute z-50 mt-1.5 min-w-[12rem] animate-slide-down overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-elevated',
            align === 'end' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore ? <div className="my-1 h-px bg-border" role="separator" /> : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  item.destructive
                    ? 'text-destructive hover:bg-destructive-muted'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                {item.icon ? <span className="mt-0.5 [&_svg]:size-3.5">{item.icon}</span> : null}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-5">{item.label}</span>
                  {item.description ? (
                    <span className="block text-2xs leading-4 text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  )
}
