'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronLeft,
  ChevronsUpDown,
  Command,
  LogOut,
  PanelLeftOpen,
  ShieldCheck,
  UserCircle,
  X,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown } from '@/components/ui/dropdown'
import { canAccess, NAV_SECTIONS } from '@/config/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn, displayName } from '@/lib/utils'

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  onOpenPalette: () => void
  unreadCount?: number
  isDemo?: boolean
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenPalette,
  unreadCount = 0,
  isDemo = false,
}: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isDemoSession } = useAuth()
  const roles = user?.roles

  const initials = displayName(user?.full_name, user?.email ?? 'Guest')

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-overlay bg-background/70 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-sidebar flex w-[264px] flex-col border-r border-border bg-surface/95 backdrop-blur-xl transition-[transform,width] duration-200 ease-smooth lg:translate-x-0',
          collapsed && 'lg:w-[76px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-topbar shrink-0 items-center border-b border-border px-4',
            collapsed ? 'lg:justify-center lg:px-2' : 'justify-between',
          )}
        >
          <Link
            href="/"
            className="flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onCloseMobile}
          >
            <Logo compact={collapsed} size="sm" className={collapsed ? 'lg:gap-0' : undefined} />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command palette trigger */}
        <div className={cn('px-3 pt-3', collapsed && 'lg:px-2')}>
          <button
            type="button"
            onClick={onOpenPalette}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border border-border bg-input/60 px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed && 'lg:justify-center lg:px-0',
            )}
            aria-label="Open command palette"
          >
            <Command className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Jump to…</span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Sections */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3" aria-label="Sections">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => canAccess(item, roles))
            if (items.length === 0) return null
            return (
              <div key={section.id} className="mb-4 last:mb-0">
                {!collapsed && (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    {section.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const isRoot = item.href === '/'
                    const active = isRoot
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    const showBadge = item.href === '/notifications' && unreadCount > 0
                    const Icon = item.icon
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          title={collapsed ? item.label : undefined}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            active
                              ? 'bg-primary-muted text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            collapsed && 'lg:justify-center lg:px-0',
                          )}
                        >
                          {active && (
                            <span
                              className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                            )}
                            strokeWidth={1.9}
                          />
                          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                          {!collapsed && showBadge && (
                            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          {collapsed && showBadge && (
                            <span
                              className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-primary lg:right-3"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn('border-t border-border p-2.5', collapsed && 'lg:px-2')}>
          {isDemoSession && !collapsed && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning-muted px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-warning">
              <ShieldCheck className="h-3 w-3" />
              Demo session
            </div>
          )}
          <Dropdown
            align="start"
            className={cn(collapsed && 'lg:[&>button]:justify-center')}
            trigger={
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  collapsed && 'lg:justify-center',
                )}
                aria-label="Account menu"
              >
                <Avatar name={initials} size="sm" status={isDemo ? 'busy' : 'online'} />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {initials}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {user?.email ?? 'Not signed in'}
                      </span>
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </>
                )}
              </button>
            }
            items={[
              {
                id: 'profile',
                label: 'Profile',
                description: 'Account and preferences',
                icon: <UserCircle />,
                onSelect: () => {
                  window.location.assign('/profile')
                },
              },
              {
                id: 'signout',
                label: 'Sign out',
                icon: <LogOut />,
                destructive: true,
                separatorBefore: true,
                onSelect: () => {
                  logout()
                  window.location.assign('/login')
                },
              },
            ]}
          />
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-[72px] hidden h-6 w-6 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-card transition-colors hover:text-foreground lg:grid"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  )
}
