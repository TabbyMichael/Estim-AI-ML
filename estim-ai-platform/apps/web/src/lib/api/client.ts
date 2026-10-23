'use client'

/**
 * Shared axios client.
 *
 * - Attaches the bearer token from localStorage on every request.
 * - Normalizes FastAPI errors into `ApiError`.
 * - On 401, performs a *single-flight* refresh through `/auth/refresh`
 *   (concurrent 401s share one refresh request), then replays the request.
 * - If refresh fails, clears the session and broadcasts a logout event so
 *   the auth context and guards can react without a page reload.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const ACCESS_TOKEN_KEY = 'access_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'
export const LOGOUT_EVENT = 'estim:logout'

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

type ApiErrorBody = {
  detail?: string | { msg?: string; loc?: (string | number)[] }[]
  message?: string
  code?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown
  /** True when the request never reached the API (DNS, offline, CORS, abort). */
  readonly isNetworkError: boolean

  constructor(
    message: string,
    options: {
      status?: number
      code?: string
      details?: unknown
      isNetworkError?: boolean
    } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? 0
    this.code = options.code
    this.details = options.details
    this.isNetworkError = options.isNetworkError ?? false
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body) return fallback
  if (typeof body === 'string') return body
  const typed = body as ApiErrorBody
  if (typeof typed.detail === 'string') return typed.detail
  if (Array.isArray(typed.detail)) {
    return typed.detail
      .map((item) => {
        const field = item.loc?.filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${item.msg ?? 'invalid value'}` : item.msg ?? ''
      })
      .filter(Boolean)
      .join('; ')
  }
  if (typeof typed.message === 'string') return typed.message
  return fallback
}

/** Convert any thrown value into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>
    const isNetworkError = !axiosError.response
    return new ApiError(
      messageFromBody(
        axiosError.response?.data,
        isNetworkError
          ? 'Cannot reach the Estim API. Check your connection or API URL.'
          : axiosError.message,
      ),
      {
        status: axiosError.response?.status ?? 0,
        code: axiosError.code,
        details: axiosError.response?.data,
        isNetworkError,
      },
    )
  }
  if (error instanceof Error) return new ApiError(error.message)
  return new ApiError('Unexpected request error')
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const apiError = toApiError(error)
  return apiError.message || fallback
}

/**
 * Demo fallback is only allowed for transport failures and server errors.
 * Auth/permission/validation failures must surface so the user can fix them.
 */
export function isDemoEligible(error: unknown): boolean {
  const apiError = toApiError(error)
  return apiError.isNetworkError || apiError.status >= 500 || apiError.status === 0
}

/* ------------------------------------------------------------------ */
/* Token storage                                                       */
/* ------------------------------------------------------------------ */

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* storage disabled */
  }
}

export const getAccessToken = () => readStorage(ACCESS_TOKEN_KEY)
export const getRefreshToken = () => readStorage(REFRESH_TOKEN_KEY)

export function setTokens(tokens: { access_token: string; refresh_token?: string }) {
  writeStorage(ACCESS_TOKEN_KEY, tokens.access_token)
  if (tokens.refresh_token) writeStorage(REFRESH_TOKEN_KEY, tokens.refresh_token)
}

export function clearTokens() {
  writeStorage(ACCESS_TOKEN_KEY, null)
  writeStorage(REFRESH_TOKEN_KEY, null)
}

export function notifyLogout(reason: 'expired' | 'manual' = 'expired') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LOGOUT_EVENT, { detail: { reason } }))
}

/** Send the user to /login while preserving the intended destination. */
export function redirectToLogin() {
  if (typeof window === 'undefined') return
  const { pathname, search } = window.location
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return
  const next = encodeURIComponent(`${pathname}${search}`)
  window.location.assign(`/login?next=${next}`)
}

/* ------------------------------------------------------------------ */
/* Axios instance                                                      */
/* ------------------------------------------------------------------ */

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const AUTH_PATHS_WITHOUT_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh']

let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError('Session expired', { status: 401 })

  // Bare axios call: avoids the interceptors (and recursion) on 401.
  const { data } = await axios.post<{ access_token: string }>(
    `${API_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { timeout: 15_000 },
  )
  setTokens({ access_token: data.access_token })
  return data.access_token
}

function singleFlightRefresh(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(toApiError(error))

    const original = error.config as RetryableConfig | undefined
    const status = error.response?.status
    const url = original?.url ?? ''
    const skipRefresh = AUTH_PATHS_WITHOUT_REFRESH.some((path) => url.includes(path))

    if (status === 401 && original && !original._retry && !skipRefresh) {
      original._retry = true
      try {
        const token = await singleFlightRefresh()
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        clearTokens()
        notifyLogout('expired')
        redirectToLogin()
        return Promise.reject(
          new ApiError('Your session expired. Please sign in again.', { status: 401 }),
        )
      }
    }

    if (status === 401 && !skipRefresh) {
      // No retry possible (e.g. refresh request itself failed).
      clearTokens()
      notifyLogout('expired')
    }

    return Promise.reject(toApiError(error))
  },
)

/* ------------------------------------------------------------------ */
/* Thin request helpers                                                */
/* ------------------------------------------------------------------ */

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<T>(config)
  return response.data
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, url, method: 'GET' }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'POST', data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'PUT', data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'PATCH', data }),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, url, method: 'DELETE' }),
}

/** Shape shared by every paginated FastAPI response. */
export type Paginated<T, K extends string> = {
  total: number
  skip: number
  limit: number
} & Record<K, T[]>

export type PageParams = {
  skip?: number
  limit?: number
}
