'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellRing,
  Boxes,
  CheckCheck,
  FileText,
  Mail,
  MessageSquare,
  ScanEye,
  ScrollText,
  ShieldAlert,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import {
  notificationsApi,
  type AppNotification,
  type NotificationList,
  type NotificationStats,
} from '@/lib/api'
import { DEMO_NOTIFICATION_LIST, DEMO_NOTIFICATION_STATS } from '@/lib/demo'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import { queryKeys } from '@/lib/query-keys'
import { cn, formatRelative, truncate } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

const PREVIEW_LIMIT = 6

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  procurement_anomaly: ShoppingCart,
  cost_overrun: TrendingUp,
  project_risk: ShieldAlert,
  maintenance_risk: Wrench,
  inspection_defect: ScanEye,
  inventory_risk: Boxes,
  report_ready: FileText,
  audit: ScrollText,
}

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Smartphone,
  push: BellRing,
  in_app: Bell,
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const EventIcon = EVENT_ICONS[notification.event_type] ?? Bell
  const ChannelIcon = CHANNEL_ICONS[notification.channel] ?? Bell
  const unread = !notification.read_at

  return (
    <li>
      <Link
        href="/notifications"
        className={cn(
          'flex gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span
          className={cn(
            'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg',
            notification.status === 'failed'
              ? 'bg-destructive-muted text-destructive'
              : 'bg-primary-muted text-primary',
          )}
        >
          <EventIcon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5">
            <span
              className={cn(
                'min-w-0 flex-1 text-xs leading-5',
                unread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
              )}
            >
              {truncate(notification.subject, 72)}
            </span>
            {unread ? (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
            ) : null}
          </span>
          <span className="mt-0.5 block text-2xs leading-4 text-muted-foreground">
            {truncate(notification.body, 96)}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/80">
            <ChannelIcon className="h-3 w-3" />
            {notification.channel.replace('_', ' ')}
            <span aria-hidden="true">·</span>
            {formatRelative(notification.created_at)}
            {notification.status === 'failed' ? (
              <span className="ml-auto font-semibold normal-case text-destructive">Delivery failed</span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  )
}

type NotificationCenterProps = {
  unreadCount: number
  className?: string
}

/**
 * Single notification bell for the whole shell. The unread count is owned by
 * `AppShell` (one stats query), while this component only loads the preview.
 */
export function NotificationCenter({ unreadCount, className }: NotificationCenterProps) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  const userId = user?.id
  const listKey = queryKeys.notifications.list({ scope: 'preview', userId })
  const statsKey = queryKeys.notifications.stats(userId)

  const listQuery = useDemoQuery<NotificationList>({
    queryKey: listKey,
    queryFn: () => notificationsApi.list({ user_id: userId!, limit: PREVIEW_LIMIT }),
    enabled: Boolean(userId) && open,
    demo: DEMO_NOTIFICATION_LIST,
  })

  const markAll = useDemoMutation<{ user_id: string; marked_read: number }, void>({
    mutationFn: () => notificationsApi.markAllRead(userId!),
    demo: () => ({ user_id: userId ?? '', marked_read: unreadCount }),
    onSuccess: (result) => {
      const now = new Date().toISOString()
      queryClient.setQueryData<NotificationStats>(statsKey, (previous) =>
        previous
          ? { ...previous, unread: 0, read: Math.max(previous.read, previous.total - previous.failed) }
          : previous,
      )
      queryClient.setQueryData<NotificationList>(listKey, (previous) =>
        previous
          ? {
              ...previous,
              notifications: previous.notifications.map((item) => ({
                ...item,
                read_at: item.read_at ?? now,
                status: item.status === 'failed' ? item.status : 'read',
              })),
            }
          : previous,
      )
      success('Inbox cleared', `${result.marked_read} notification(s) marked as read.`)
    },
    onError: (mutationError) => {
      toastError('Could not update notifications', mutationError.message)
    },
  })

  const items = listQuery.data?.notifications.slice(0, PREVIEW_LIMIT) ?? []
  const hasUnread = unreadCount > 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'bg-accent text-foreground',
        )}
      >
        <Bell className="h-4 w-4" />
        {hasUnread ? (
          <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed left-3 right-3 top-[4.5rem] z-50 animate-slide-down overflow-hidden rounded-xl border border-border bg-popover shadow-elevated sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
              {hasUnread ? (
                <span className="rounded-full bg-primary-muted px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadCount} new
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={!hasUnread || markAll.isPending}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[min(60vh,400px)] overflow-y-auto scrollbar-thin p-1.5">
            {listQuery.isLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-2.5 rounded-lg p-2.5">
                    <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-3/5 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listQuery.isError ? (
              <p className="px-3 py-6 text-center text-xs text-destructive">
                Notifications could not be loaded.
              </p>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Bell className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">You&apos;re all caught up</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  New alerts will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              View all notifications
            </Link>
            {listQuery.isDemo ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-warning">
                Demo data
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
