'use client'

import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Mail,
  MessageSquare,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  AppNotification,
  NotificationList,
  NotificationPreference,
  NotificationStats,
} from '@/lib/api/notifications'
import { notificationsApi } from '@/lib/api/notifications'
import { useAuth } from '@/lib/auth-context'
import {
  DEMO_NOTIFICATION_CHANNELS,
  DEMO_NOTIFICATION_EVENTS,
  DEMO_NOTIFICATION_LIST,
  DEMO_NOTIFICATION_PREFERENCES,
  DEMO_NOTIFICATION_STATS,
  DEMO_USER_ID,
} from '@/lib/demo/notifications'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { Switch } from '@/components/ui/switch'
import { cn, formatNumber, formatRelative, humanize } from '@/lib/utils'

type StatusFilter = 'all' | 'unread' | 'read' | 'failed'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
]

const CHANNEL_META: Record<string, { label: string; icon: LucideIcon; tone: 'primary' | 'info' | 'warning' | 'success' }> = {
  in_app: { label: 'In-app', icon: Bell, tone: 'primary' },
  email: { label: 'Email', icon: Mail, tone: 'info' },
  sms: { label: 'SMS', icon: MessageSquare, tone: 'warning' },
  push: { label: 'Push', icon: Smartphone, tone: 'success' },
}

const CHANNELS = DEMO_NOTIFICATION_CHANNELS
const EVENTS = DEMO_NOTIFICATION_EVENTS

function isUnread(notification: AppNotification): boolean {
  return !notification.read_at && notification.status !== 'failed'
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const queryClient = useQueryClient()
  const userId = user?.id ?? DEMO_USER_ID

  const LIST_KEY = queryKeys.notifications.list({ userId, scope: 'page' })
  const STATS_KEY = queryKeys.notifications.stats(userId)
  const PREFS_KEY = queryKeys.notifications.preferences(userId)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')

  const listQuery = useDemoQuery<NotificationList>({
    queryKey: LIST_KEY,
    queryFn: () => notificationsApi.list({ user_id: userId, limit: 100 }),
    demo: DEMO_NOTIFICATION_LIST,
  })
  const statsQuery = useDemoQuery<NotificationStats>({
    queryKey: STATS_KEY,
    queryFn: () => notificationsApi.stats(userId),
    demo: DEMO_NOTIFICATION_STATS,
  })
  const prefsQuery = useDemoQuery<NotificationPreference[]>({
    queryKey: PREFS_KEY,
    queryFn: () => notificationsApi.listPreferences(userId),
    demo: DEMO_NOTIFICATION_PREFERENCES,
  })

  const notifications = useMemo(() => listQuery.data?.notifications ?? [], [listQuery.data])
  const stats = statsQuery.data

  const filtered = useMemo(() => {
    return notifications.filter((notification) => {
      if (channelFilter !== 'all' && notification.channel !== channelFilter) return false
      if (statusFilter === 'unread') return isUnread(notification)
      if (statusFilter === 'read') return Boolean(notification.read_at)
      if (statusFilter === 'failed') return notification.status === 'failed'
      return true
    })
  }, [notifications, statusFilter, channelFilter])

  const prefMap = useMemo(() => {
    const map = new Map<string, boolean>()
    ;(prefsQuery.data ?? []).forEach((preference) => {
      map.set(`${preference.channel}:${preference.event_type}`, preference.enabled)
    })
    return map
  }, [prefsQuery.data])

  const prefEnabled = (channel: string, eventType: string) =>
    prefMap.get(`${channel}:${eventType}`) ?? channel === 'in_app'

  const invalidateLive = () => {
    if (!listQuery.isDemo) queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })
  }

  const markRead = useDemoMutation<AppNotification, string>({
    mutationFn: (id) => notificationsApi.markRead(id),
    demo: (id, client) => {
      const now = new Date().toISOString()
      const current = client.getQueryData<NotificationList>(LIST_KEY)
      const existing = current?.notifications.find((notification) => notification.id === id)
      const updated: AppNotification = existing
        ? { ...existing, status: 'read', read_at: now }
        : {
            id,
            user_id: userId,
            channel: 'in_app',
            subject: 'Notification',
            body: '',
            status: 'read',
            event_type: 'unknown',
            created_at: now,
            read_at: now,
          }
      client.setQueryData<NotificationList>(LIST_KEY, (value) =>
        value
          ? {
              ...value,
              notifications: value.notifications.map((notification) =>
                notification.id === id ? updated : notification,
              ),
            }
          : value,
      )
      if (existing && isUnread(existing)) {
        client.setQueryData<NotificationStats>(STATS_KEY, (value) =>
          value
            ? {
                ...value,
                unread: Math.max(0, value.unread - 1),
                read: value.read + 1,
              }
            : value,
        )
      }
      return updated
    },
    onSuccess: () => {
      success('Marked as read')
      invalidateLive()
    },
    onError: (mutationError) => {
      toastError('Could not update notification', mutationError.message)
    },
  })

  const markAllRead = useDemoMutation<{ user_id: string; marked_read: number }, void>({
    mutationFn: () => notificationsApi.markAllRead(userId),
    demo: (_vars, client) => {
      const now = new Date().toISOString()
      const current = client.getQueryData<NotificationList>(LIST_KEY)
      const unread = current?.notifications.filter(isUnread).length ?? 0
      client.setQueryData<NotificationList>(LIST_KEY, (value) =>
        value
          ? {
              ...value,
              notifications: value.notifications.map((notification) =>
                isUnread(notification)
                  ? { ...notification, status: 'read', read_at: now }
                  : notification,
              ),
            }
          : value,
      )
      client.setQueryData<NotificationStats>(STATS_KEY, (value) =>
        value ? { ...value, unread: 0, read: value.total - value.failed } : value,
      )
      return { user_id: userId, marked_read: unread }
    },
    onSuccess: ({ marked_read }) => {
      success('Inbox cleared', `${marked_read} notifications marked as read.`)
      invalidateLive()
    },
    onError: (mutationError) => {
      toastError('Could not mark all as read', mutationError.message)
    },
  })

  const remove = useDemoMutation<void, string>({
    mutationFn: (id) => notificationsApi.remove(id),
    demo: (id, client) => {
      const current = client.getQueryData<NotificationList>(LIST_KEY)
      const existing = current?.notifications.find((notification) => notification.id === id)
      client.setQueryData<NotificationList>(LIST_KEY, (value) =>
        value
          ? {
              ...value,
              notifications: value.notifications.filter((notification) => notification.id !== id),
              total: Math.max(0, value.total - 1),
            }
          : value,
      )
      if (existing) {
        client.setQueryData<NotificationStats>(STATS_KEY, (value) =>
          value
            ? {
                ...value,
                total: Math.max(0, value.total - 1),
                unread: isUnread(existing) ? Math.max(0, value.unread - 1) : value.unread,
                read: existing.read_at ? Math.max(0, value.read - 1) : value.read,
                failed:
                  existing.status === 'failed' ? Math.max(0, value.failed - 1) : value.failed,
              }
            : value,
        )
      }
      return undefined
    },
    onSuccess: () => {
      success('Notification deleted')
      invalidateLive()
    },
    onError: (mutationError) => {
      toastError('Could not delete notification', mutationError.message)
    },
  })

  const prefMutation = useDemoMutation<
    NotificationPreference,
    { channel: string; eventType: string; enabled: boolean }
  >({
    mutationFn: ({ channel, eventType, enabled }) =>
      notificationsApi.upsertPreference(userId, {
        channel,
        event_type: eventType,
        enabled,
      }),
    demo: ({ channel, eventType, enabled }, client) => {
      const updated: NotificationPreference = {
        user_id: userId,
        channel,
        event_type: eventType,
        enabled,
      }
      client.setQueryData<NotificationPreference[]>(PREFS_KEY, (value) => {
        const current = value ?? []
        const exists = current.some(
          (preference) =>
            preference.channel === channel && preference.event_type === eventType,
        )
        return exists
          ? current.map((preference) =>
              preference.channel === channel && preference.event_type === eventType
                ? updated
                : preference,
            )
          : [...current, updated]
      })
      return updated
    },
    onSuccess: () => {
      if (!prefsQuery.isDemo) {
        queryClient.invalidateQueries({ queryKey: PREFS_KEY })
      }
    },
    onError: (mutationError) => {
      toastError('Could not save preference', mutationError.message)
    },
  })

  const togglePreference = (channel: string, eventType: string, enabled: boolean) => {
    prefMutation.mutate({ channel, eventType, enabled })
  }

  const hasUnread = (stats?.unread ?? 0) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Notifications"
        description="Delivery history across every channel, with read and delete actions plus a per-channel preference matrix."
        demo={listQuery.isDemo || statsQuery.isDemo || prefsQuery.isDemo}
        actions={
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={!hasUnread || markAllRead.isPending}
            loading={markAllRead.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all read
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total"
          value={stats ? formatNumber(stats.total) : '—'}
          hint="Notifications in the inbox"
          icon={Bell}
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Unread"
          value={stats ? formatNumber(stats.unread) : '—'}
          hint="Awaiting your attention"
          icon={AlertTriangle}
          tone="warning"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Read"
          value={stats ? formatNumber(stats.read) : '—'}
          hint="Acknowledged items"
          icon={CheckCheck}
          tone="success"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Failed"
          value={stats ? formatNumber(stats.failed) : '—'}
          hint="Delivery failures"
          icon={Mail}
          tone={stats && stats.failed > 0 ? 'danger' : 'neutral'}
          loading={statsQuery.isLoading}
        />
      </div>

      <Card>
        <CardToolbar
          title="Inbox"
          description={`${filtered.length} of ${notifications.length} notifications shown.`}
          actions={
            <Select
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
              aria-label="Filter by channel"
              className="h-8 w-36 text-xs"
            >
              <option value="all">All channels</option>
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_META[channel]?.label ?? humanize(channel)}
                </option>
              ))}
            </Select>
          }
        />
        <CardContent>
          <SegmentedControl<StatusFilter>
            options={STATUS_OPTIONS}
            value={statusFilter}
            onValueChange={setStatusFilter}
            size="sm"
            aria-label="Filter by status"
            className="mb-4"
          />

          {listQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={
                notifications.length === 0
                  ? 'No notifications yet'
                  : 'No notifications match the filters'
              }
              description={
                notifications.length === 0
                  ? 'Module alerts will appear here as they are delivered.'
                  : 'Try another status or channel filter.'
              }
              compact
            />
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {filtered.map((notification) => {
                const channel = CHANNEL_META[notification.channel] ?? {
                  label: humanize(notification.channel),
                  icon: Bell,
                  tone: 'info' as const,
                }
                const ChannelIcon = channel.icon
                const unread = isUnread(notification)

                return (
                  <li
                    key={notification.id}
                    className={cn('flex gap-3 p-4', unread && 'bg-primary-muted/20')}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        unread ? 'bg-primary' : 'bg-border',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={cn(
                            'text-sm text-foreground',
                            unread ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notification.subject}
                        </p>
                        <Badge tone={channel.tone} size="sm">
                          <ChannelIcon className="h-3 w-3" aria-hidden="true" />
                          {channel.label}
                        </Badge>
                        <Badge
                          tone={
                            notification.status === 'failed'
                              ? 'danger'
                              : notification.read_at
                                ? 'neutral'
                                : 'info'
                          }
                          size="sm"
                        >
                          {notification.status === 'failed'
                            ? 'Failed'
                            : notification.read_at
                              ? 'Read'
                              : 'Unread'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-1.5 text-2xs text-muted-foreground">
                        <span className="font-mono">{notification.event_type}</span> ·{' '}
                        {formatRelative(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
                      {unread ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markRead.mutate(notification.id)}
                          disabled={markRead.isPending}
                        >
                          Mark read
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove.mutate(notification.id)}
                        disabled={remove.isPending}
                        aria-label={`Delete ${notification.subject}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardToolbar
          title="Notification preferences"
          description="Choose which channels deliver each event type. Changes are saved immediately."
          actions={
            <Badge tone="outline">
              {CHANNELS.length} channels × {EVENTS.length} events
            </Badge>
          }
        />
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[820px] border-collapse text-left text-xs">
              <caption className="sr-only">Notification channel preference matrix</caption>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-card px-3 py-2 text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Channel
                  </th>
                  {EVENTS.map((eventType) => (
                    <th
                      key={eventType}
                      scope="col"
                      className="px-2 py-2 text-center text-2xs font-medium text-muted-foreground"
                    >
                      {humanize(eventType)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((channel) => {
                  const meta = CHANNEL_META[channel] ?? {
                    label: humanize(channel),
                    icon: Bell,
                    tone: 'info' as const,
                  }
                  const ChannelIcon = meta.icon
                  return (
                    <tr key={channel} className="border-b border-border/60 last:border-0">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-foreground"
                      >
                        <span className="flex items-center gap-2">
                          <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </th>
                      {EVENTS.map((eventType) => (
                        <td key={eventType} className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <Switch
                              size="sm"
                              checked={prefEnabled(channel, eventType)}
                              onCheckedChange={(checked) =>
                                togglePreference(channel, eventType, checked)
                              }
                              aria-label={`${meta.label} notifications for ${humanize(eventType)}`}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-2xs text-muted-foreground">
            In-app delivery is on by default when no explicit preference exists. Toggles persist
            per user, channel and event type.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
