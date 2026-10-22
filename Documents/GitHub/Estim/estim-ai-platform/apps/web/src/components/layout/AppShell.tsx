'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { notificationsApi, type NotificationStats } from '@/lib/api'
import { DEMO_NOTIFICATION_STATS } from '@/lib/demo'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const COLLAPSE_KEY = 'estim:sidebar-collapsed'

/**
 * The single application chrome: fixed sidebar, sticky topbar, content
 * container and the command palette. `(dashboard)/layout.tsx` wraps this in
 * `AuthGuard`, so a session is guaranteed here.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isDemoSession } = useAuth()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  // Restore the persisted rail preference after hydration.
  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* storage disabled */
    }
  }, [])

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* storage disabled */
      }
      return next
    })
  }, [])

  // Close transient surfaces on navigation.
  React.useEffect(() => {
    setMobileOpen(false)
    setPaletteOpen(false)
  }, [pathname])

  // ⌘K / Ctrl+K opens the palette from anywhere.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Mobile drawer: Escape closes and the background stops scrolling.
  React.useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  const userId = user?.id
  const { data: stats } = useDemoQuery<NotificationStats>({
    queryKey: queryKeys.notifications.stats(userId),
    queryFn: () => notificationsApi.stats(userId!),
    enabled: Boolean(userId),
    demo: DEMO_NOTIFICATION_STATS,
  })

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-toast focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-elevated"
      >
        Skip to content
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenPalette={() => setPaletteOpen(true)}
        unreadCount={stats?.unread ?? 0}
        isDemo={isDemoSession}
      />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200 ease-smooth',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]',
        )}
      >
        <Topbar
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          unreadCount={stats?.unread ?? 0}
          isDemo={isDemoSession}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
