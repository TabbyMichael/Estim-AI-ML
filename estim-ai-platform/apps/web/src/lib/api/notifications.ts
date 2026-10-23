'use client'

/**
 * Notifications: /notifications.
 *
 * Correct parameter placement (previously sent in request bodies by mistake):
 * - `POST /notifications/read-all?user_id=`
 * - `GET  /notifications/stats/summary?user_id=`
 * - `GET  /notifications?user_id=&status=`
 * - `PUT  /notifications/{user_id}/preferences` (body: preference)
 */

import { http, type PageParams, type Paginated } from './client'

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read' | string
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | string

export type AppNotification = {
  id: string
  user_id: string
  channel: NotificationChannel
  subject: string
  body: string
  status: NotificationStatus
  event_type: string
  created_at: string
  sent_at?: string | null
  read_at?: string | null
}

export type NotificationStats = {
  total: number
  unread: number
  read: number
  failed: number
}

export type NotificationPreference = {
  user_id: string
  channel: string
  event_type: string
  enabled: boolean
}

export type NotificationList = Paginated<AppNotification, 'notifications'>

export const notificationsApi = {
  list: (params: PageParams & { user_id: string; status?: string }) =>
    http.get<NotificationList>('/notifications', { params }),

  stats: (userId: string) =>
    http.get<NotificationStats>('/notifications/stats/summary', { params: { user_id: userId } }),

  markRead: (notificationId: string) =>
    http.post<AppNotification>(`/notifications/${notificationId}/read`),

  markAllRead: (userId: string) =>
    http.post<{ user_id: string; marked_read: number }>('/notifications/read-all', undefined, {
      params: { user_id: userId },
    }),

  remove: (notificationId: string) => http.delete<void>(`/notifications/${notificationId}`),

  listPreferences: (userId: string) =>
    http.get<NotificationPreference[]>(`/notifications/${userId}/preferences`),

  upsertPreference: (
    userId: string,
    payload: { channel: string; event_type?: string; enabled: boolean },
  ) =>
    http.put<NotificationPreference>(`/notifications/${userId}/preferences`, {
      event_type: '*',
      ...payload,
    }),
}
