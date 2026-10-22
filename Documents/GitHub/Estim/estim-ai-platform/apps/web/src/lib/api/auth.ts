'use client'

/** Identity: /auth/*, /users/me, /admin/*. */

import { http } from './client'

export type Role = {
  name: string
  description: string
  permissions: string[]
}

export type Permission = {
  code: string
  description: string
}

export type User = {
  id: string
  email: string
  full_name: string
  is_active: boolean
  roles: string[]
  created_at: string
  last_login_at?: string | null
}

export type UserActivity = {
  user_id: string
  email: string
  last_login_at?: string | null
  is_active: boolean
  roles: string[]
}

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type UserListResponse = {
  users: User[]
  total: number
  skip: number
  limit: number
}

export type LoginPayload = { email: string; password: string }
export type RegisterPayload = { email: string; password: string; full_name: string }

export const authApi = {
  login: (payload: LoginPayload) => http.post<TokenResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) => http.post<User>('/auth/register', payload),
  me: () => http.get<User>('/users/me'),
  updateProfile: (payload: { full_name: string }) => http.put<User>('/users/me', payload),
  changePassword: (payload: { old_password: string; new_password: string }) =>
    http.post<void>('/users/me/change-password', payload),
}
