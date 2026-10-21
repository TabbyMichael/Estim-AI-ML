'use client'

/** Admin: /admin/users, /admin/roles, /admin/permissions. */

import { http } from './client'
import type { Permission, Role, User, UserActivity, UserListResponse } from './auth'

export type AdminUserPayload = {
  email: string
  password: string
  full_name?: string
  roles?: string[]
}

export type AdminUserUpdatePayload = {
  full_name?: string
  roles?: string[]
  is_active?: boolean
}

export const adminApi = {
  listUsers: (params: {
    skip?: number
    limit?: number
    q?: string
    is_active?: boolean
  }) => http.get<UserListResponse>('/admin/users', { params }),

  createUser: (payload: AdminUserPayload) => http.post<User>('/admin/users', payload),

  updateUser: (userId: string, payload: AdminUserUpdatePayload) =>
    http.put<User>(`/admin/users/${userId}`, payload),

  deactivateUser: (userId: string) => http.post<User>(`/admin/users/${userId}/deactivate`),

  reactivateUser: (userId: string) => http.post<User>(`/admin/users/${userId}/reactivate`),

  // Backend expects a bare JSON array body: ["id-1", "id-2"].
  bulkActivate: (userIds: string[]) => http.post<User[]>('/admin/users/bulk-activate', userIds),

  bulkDeactivate: (userIds: string[]) => http.post<User[]>('/admin/users/bulk-deactivate', userIds),

  assignRole: (userId: string, role: string) =>
    http.post<User>(`/admin/users/${userId}/roles`, { role }),

  removeRole: (userId: string, role: string) =>
    http.delete<User>(`/admin/users/${userId}/roles/${encodeURIComponent(role)}`),

  listRoles: () => http.get<Role[]>('/admin/roles'),

  createRole: (payload: { name: string; description?: string }) =>
    http.post<Role>('/admin/roles', payload),

  grantPermission: (roleName: string, permission: string) =>
    http.post<Role>(`/admin/roles/${encodeURIComponent(roleName)}/permissions`, { permission }),

  revokePermission: (roleName: string, permission: string) =>
    http.delete<Role>(
      `/admin/roles/${encodeURIComponent(roleName)}/permissions/${encodeURIComponent(permission)}`,
    ),

  listPermissions: () => http.get<Permission[]>('/admin/permissions'),

  listActivity: (params?: { skip?: number; limit?: number }) =>
    http.get<UserActivity[]>('/admin/users/activity', { params }),
}
