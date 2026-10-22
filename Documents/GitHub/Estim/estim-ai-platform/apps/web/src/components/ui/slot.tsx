'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
}

/**
 * Minimal `asChild` primitive: merges the wrapper's props/className onto its
 * single child element so `<Button asChild><Link/></Button>` produces a real
 * anchor while keeping button styling.
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, className, ...props },
  ref,
) {
  if (!React.isValidElement(children)) return null

  const child = children as React.ReactElement<Record<string, unknown>>
  const childProps = child.props as { className?: string; ref?: React.Ref<HTMLElement> }

  return React.cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, childProps.className),
    ref: ref ?? childProps.ref,
  })
})
