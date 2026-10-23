/** Notification fixtures: inbox, stats and preference matrix. */

import type {
  AppNotification,
  NotificationList,
  NotificationPreference,
  NotificationStats,
} from '../api/notifications'
import { daysAgo, hoursAgo } from './seed'

export const DEMO_USER_ID = 'usr-admin'

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    user_id: DEMO_USER_ID,
    channel: 'in_app',
    subject: 'High-severity anomaly on PO-2026-0420',
    body: 'AHU pricing is 21.9% above the peer median. Review recommended before approval.',
    status: 'sent',
    event_type: 'procurement_anomaly',
    created_at: hoursAgo(2),
    sent_at: hoursAgo(2),
    read_at: null,
  },
  {
    id: 'notif-2',
    user_id: DEMO_USER_ID,
    channel: 'in_app',
    subject: 'Meridian Hospital Wing flagged critical',
    body: 'Delay probability for "Ward fit-out" reached 84%. Schedule recovery plan required.',
    status: 'sent',
    event_type: 'project_risk',
    created_at: hoursAgo(5),
    sent_at: hoursAgo(5),
    read_at: null,
  },
  {
    id: 'notif-3',
    user_id: DEMO_USER_ID,
    channel: 'email',
    subject: 'Weekly executive summary is ready',
    body: 'Executive summary — week 38 has been generated and is available in Reports.',
    status: 'sent',
    event_type: 'report_ready',
    created_at: hoursAgo(7),
    sent_at: hoursAgo(7),
    read_at: null,
  },
  {
    id: 'notif-4',
    user_id: DEMO_USER_ID,
    channel: 'in_app',
    subject: 'Equipment health: Chiller CH-02 critical',
    body: 'Failure probability 64% within 30 days. Maintenance window suggested this week.',
    status: 'sent',
    event_type: 'maintenance_risk',
    created_at: daysAgo(1),
    sent_at: daysAgo(1),
    read_at: daysAgo(1),
  },
  {
    id: 'notif-5',
    user_id: DEMO_USER_ID,
    channel: 'in_app',
    subject: 'Rework required — Level 12 slab',
    body: 'Inspection found 4 defects including exposed rebar. Rework flagged for the pour.',
    status: 'sent',
    event_type: 'inspection_defect',
    created_at: daysAgo(1),
    sent_at: daysAgo(1),
    read_at: null,
  },
  {
    id: 'notif-6',
    user_id: DEMO_USER_ID,
    channel: 'sms',
    subject: 'Cost overrun risk — Northgate',
    body: 'Forecast v2.4.1 raised the upper bound to $71.8M (+14.8% vs baseline).',
    status: 'sent',
    event_type: 'cost_overrun',
    created_at: daysAgo(2),
    sent_at: daysAgo(2),
    read_at: daysAgo(2),
  },
  {
    id: 'notif-7',
    user_id: DEMO_USER_ID,
    channel: 'in_app',
    subject: 'Stockout risk: gypsum board at Meridian',
    body: 'Days of cover dropped to 7.4 at current daily demand. Reorder 1,240 units.',
    status: 'sent',
    event_type: 'inventory_risk',
    created_at: daysAgo(2),
    sent_at: daysAgo(2),
    read_at: null,
  },
  {
    id: 'notif-8',
    user_id: DEMO_USER_ID,
    channel: 'email',
    subject: 'Anomaly review assigned to you',
    body: 'PO-2026-0427 flagged off-contract supplier spend for the Atlas Solar Farm.',
    status: 'sent',
    event_type: 'procurement_anomaly',
    created_at: daysAgo(3),
    sent_at: daysAgo(3),
    read_at: daysAgo(3),
  },
  {
    id: 'notif-9',
    user_id: DEMO_USER_ID,
    channel: 'push',
    subject: 'Report generation failed',
    body: 'Executive summary — week 37 failed: template rendering timed out after 30s.',
    status: 'failed',
    event_type: 'report_ready',
    created_at: daysAgo(4),
    sent_at: null,
    read_at: null,
  },
  {
    id: 'notif-10',
    user_id: DEMO_USER_ID,
    channel: 'in_app',
    subject: 'Audit retention purge completed',
    body: '1,284 audit entries older than 365 days were purged.',
    status: 'sent',
    event_type: 'audit',
    created_at: daysAgo(6),
    sent_at: daysAgo(6),
    read_at: daysAgo(6),
  },
]

export const DEMO_NOTIFICATION_LIST: NotificationList = {
  notifications: DEMO_NOTIFICATIONS,
  total: DEMO_NOTIFICATIONS.length,
  skip: 0,
  limit: 50,
}

export const DEMO_NOTIFICATION_STATS: NotificationStats = {
  total: DEMO_NOTIFICATIONS.length,
  unread: DEMO_NOTIFICATIONS.filter((item) => !item.read_at).length,
  read: DEMO_NOTIFICATIONS.filter((item) => Boolean(item.read_at)).length,
  failed: DEMO_NOTIFICATIONS.filter((item) => item.status === 'failed').length,
}

export const DEMO_NOTIFICATION_EVENTS = [
  'procurement_anomaly',
  'cost_overrun',
  'project_risk',
  'maintenance_risk',
  'inspection_defect',
  'inventory_risk',
  'report_ready',
]

export const DEMO_NOTIFICATION_CHANNELS = ['in_app', 'email', 'sms', 'push'] as const

export const DEMO_NOTIFICATION_PREFERENCES: NotificationPreference[] =
  DEMO_NOTIFICATION_CHANNELS.flatMap((channel) =>
    DEMO_NOTIFICATION_EVENTS.map((eventType) => ({
      user_id: DEMO_USER_ID,
      channel,
      event_type: eventType,
      enabled:
        channel === 'in_app' ||
        (channel === 'email' && ['report_ready', 'procurement_anomaly'].includes(eventType)) ||
        (channel === 'sms' && ['project_risk', 'maintenance_risk'].includes(eventType)),
    })),
  )
