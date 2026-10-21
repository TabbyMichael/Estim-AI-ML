'use client'

import { CloudCog, Radio, ServerCog, TimerReset } from 'lucide-react'
import type { ConnectionState } from '@/lib/realtime-context'
import { cn } from '@/lib/utils'

type Status = {
  label: string
  value: string
  detail: string
  tone: 'success' | 'warning' | 'danger' | 'muted'
}

const toneDot = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground',
} as const

const toneText = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
} as const

/** Operational health strip: API, ERP sync, realtime socket, freshness. */
export function SystemStatus({
  apiState,
  realtime,
  lastSync,
  className,
}: {
  apiState: 'ok' | 'demo' | 'error'
  realtime: ConnectionState
  lastSync: string
  className?: string
}) {
  const realtimeMap: Record<ConnectionState, { value: string; tone: Status['tone'] }> = {
    connected: { value: 'Live', tone: 'success' },
    connecting: { value: 'Connecting', tone: 'warning' },
    disconnected: { value: 'Offline', tone: 'muted' },
  }

  const items: ({ icon: typeof ServerCog } & Status)[] = [
    {
      icon: ServerCog,
      label: 'Estim API',
      value: apiState === 'ok' ? 'Operational' : apiState === 'demo' ? 'Demo fallback' : 'Degraded',
      detail: apiState === 'ok' ? 'All endpoints responding' : apiState === 'demo' ? 'Fixtures enabled' : 'Requests failing',
      tone: apiState === 'ok' ? 'success' : apiState === 'demo' ? 'warning' : 'danger',
    },
    {
      icon: CloudCog,
      label: 'Odoo sync',
      value: apiState === 'demo' ? 'Simulated' : 'Connected',
      detail: 'Hourly schedule',
      tone: apiState === 'demo' ? 'warning' : 'success',
    },
    {
      icon: Radio,
      label: 'Realtime socket',
      value: realtimeMap[realtime].value,
      detail: 'Push updates',
      tone: realtimeMap[realtime].tone,
    },
    {
      icon: TimerReset,
      label: 'Last data sync',
      value: lastSync,
      detail: 'Across all modules',
      tone: 'muted',
    },
  ]

  return (
    <section
      aria-label="System status"
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="flex items-center gap-3 bg-card px-4 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-2xs uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
              <p className={cn('flex items-center gap-1.5 text-xs font-medium', toneText[item.tone])}>
                <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[item.tone])} aria-hidden="true" />
                {item.value}
              </p>
              <p className="text-2xs text-muted-foreground/80">{item.detail}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}
