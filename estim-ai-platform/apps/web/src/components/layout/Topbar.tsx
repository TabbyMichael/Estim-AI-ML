'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronRight,
  Command,
  FlaskConical,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserCircle,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown } from '@/components/ui/dropdown'
import { Tooltip } from '@/components/ui/tooltip'
import { NotificationCenter } from '@/components/layout/NotificationCenter'
import { findNavMatch } from '@/config/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-provider'
import { useRealtime } from '@/lib/realtime-context'
import { cn, displayName, humanize } from '@/lib/utils'

type TopbarProps = {
  onOpenMobileNav: () => void
  onOpenPalette: () => void
  unreadCount: number
  isDemo?: boolean
}

const CONNECTION_STYLE = {
  connected: { dot: 'bg-success', label: 'Live', text: 'text-success' },
  connecting: { dot: 'bg-warning', label: 'Connecting', text: 'text-warning' },
  disconnected: { dot: 'bg-muted-foreground', label: 'Offline', text: 'text-muted-foreground' },
} as const

function Breadcrumbs() {
  const pathname = usePathname()
  const match = findNavMatch(pathname)

  if (!match) {
    const segment = pathname.split('/').filter(Boolean).pop()
    return (
      <span className="truncate text-sm font-semibold text-foreground">
        {segment ? humanize(segment) : 'Dashboard'}
      </span>
    )
  }

  const isRoot = match.item.href === '/'

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-xs">
        {!isRoot ? (
          <>
            <li className="hidden shrink-0 text-muted-foreground sm:block">{match.section.label}</li>
            <li className="hidden shrink-0 text-muted-foreground/50 sm:block" aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
          </>
        ) : null}
        <li className="min-w-0">
          <span
            aria-current="page"
            className="block truncate text-sm font-semibold text-foreground"
          >
            {match.item.label}
          </span>
        </li>
      </ol>
    </nav>
  )
}

function RealtimeIndicator() {
  const { state } = useRealtime()
  const style = CONNECTION_STYLE[state]

  return (
    <Tooltip
      content={
        state === 'connected'
          ? 'Realtime channel connected'
          : state === 'connecting'
            ? 'Reconnecting to the realtime channel…'
            : 'Realtime channel offline — data refreshes on demand'
      }
      side="bottom"
    >
      <span
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2"
        aria-live="polite"
        aria-label={`Realtime connection: ${style.label}`}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />
        <span className={cn('hidden text-[11px] font-medium xl:inline', style.text)}>
          {style.label}
        </span>
      </span>
    </Tooltip>
  )
}

export function Topbar({ onOpenMobileNav, onOpenPalette, unreadCount, isDemo = false }: TopbarProps) {
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const router = useRouter()

  const name = displayName(user?.full_name, user?.email ?? 'Operator')

  return (
    <header className="sticky top-0 z-topbar flex h-topbar shrink-0 items-center gap-1.5 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-2 sm:px-5">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Breadcrumbs />

      <div className="flex-1" />

      {isDemo ? (
        <span className="hidden items-center gap-1.5 rounded-full border border-warning/30 bg-warning-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning md:inline-flex">
          <FlaskConical className="h-3 w-3" />
          Demo data
        </span>
      ) : null}

      <button
        type="button"
        onClick={onOpenPalette}
        className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-input/50 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
        aria-label="Search and jump"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="ml-1 hidden rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] font-medium lg:inline">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={onOpenPalette}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        aria-label="Search and jump"
      >
        <Command className="h-4 w-4" />
      </button>

      <RealtimeIndicator />

      <NotificationCenter unreadCount={unreadCount} />

      <Tooltip content={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} side="bottom">
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </Tooltip>

      <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

      <Dropdown
        align="end"
        trigger={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <Avatar name={name} size="sm" status={isDemo ? 'busy' : 'online'} />
            <span className="hidden max-w-[9rem] truncate text-xs font-medium text-foreground lg:block">
              {name}
            </span>
          </button>
        }
        items={[
          {
            id: 'profile',
            label: 'Profile',
            description: 'Account, preferences and security',
            icon: <UserCircle />,
            onSelect: () => router.push('/profile'),
          },
          {
            id: 'signout',
            label: 'Sign out',
            icon: <LogOut />,
            destructive: true,
            separatorBefore: true,
            onSelect: () => {
              logout()
              router.replace('/login')
            },
          },
        ]}
      />
    </header>
  )
}
