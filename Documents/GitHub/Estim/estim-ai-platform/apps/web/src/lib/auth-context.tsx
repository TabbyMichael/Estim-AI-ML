'use client'

/**
 * Auth context built on the shared API client.
 *
 * Demo session: if the API is unreachable (network error or 5xx) during sign
 * in / sign up, we establish a local "demo operator" session so the product
 * can still be explored. Every query then falls back to fixtures via
 * `useDemoQuery`, and writes are simulated.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  LOGOUT_EVENT,
  authApi,
  clearTokens,
  getAccessToken,
  isDemoEligible,
  setTokens,
  type User,
} from '@/lib/api'
import { DEMO_SESSION_USER } from '@/lib/demo/people'

export const DEMO_SESSION_KEY = 'estim_demo_session'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isDemoSession: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateProfile: (fullName: string) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readDemoFlag(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEMO_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeDemoFlag(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage.setItem(DEMO_SESSION_KEY, '1')
    else window.localStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    /* storage disabled */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoSession, setIsDemoSession] = useState(false)
  const mounted = useRef(true)

  const startDemoSession = useCallback(() => {
    writeDemoFlag(true)
    setIsDemoSession(true)
    setUser(DEMO_SESSION_USER)
  }, [])

  const endSession = useCallback(() => {
    clearTokens()
    writeDemoFlag(false)
    setIsDemoSession(false)
    setUser(null)
  }, [])

  const logout = useCallback(() => {
    endSession()
  }, [endSession])

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) return
    try {
      const me = await authApi.me()
      if (mounted.current) {
        setUser(me)
        setIsDemoSession(false)
      }
    } catch (error) {
      if (isDemoEligible(error)) {
        startDemoSession()
        return
      }
      endSession()
    }
  }, [endSession, startDemoSession])

  // Initial session restoration (runs once).
  useEffect(() => {
    mounted.current = true
    let cancelled = false

    async function boot() {
      if (readDemoFlag()) {
        if (!cancelled) {
          setIsDemoSession(true)
          setUser(DEMO_SESSION_USER)
          setIsLoading(false)
        }
        return
      }

      const token = getAccessToken()
      if (!token) {
        if (!cancelled) setIsLoading(false)
        return
      }

      try {
        const me = await authApi.me()
        if (!cancelled) setUser(me)
      } catch (error) {
        if (isDemoEligible(error)) {
          startDemoSession()
        } else {
          endSession()
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void boot()
    return () => {
      cancelled = true
      mounted.current = false
    }
  }, [endSession, startDemoSession])

  // Clear local state whenever the API client reports an expired session.
  useEffect(() => {
    const handler = () => {
      writeDemoFlag(false)
      setIsDemoSession(false)
      setUser(null)
    }
    window.addEventListener(LOGOUT_EVENT, handler)
    return () => window.removeEventListener(LOGOUT_EVENT, handler)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const tokens = await authApi.login({ email, password })
        setTokens(tokens)
        writeDemoFlag(false)
        const me = await authApi.me()
        setUser(me)
        setIsDemoSession(false)
      } catch (error) {
        if (isDemoEligible(error)) {
          startDemoSession()
          return
        }
        throw error
      }
    },
    [startDemoSession],
  )

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        await authApi.register({ email, password, full_name: fullName })
        const tokens = await authApi.login({ email, password })
        setTokens(tokens)
        writeDemoFlag(false)
        const me = await authApi.me()
        setUser(me)
        setIsDemoSession(false)
      } catch (error) {
        if (isDemoEligible(error)) {
          startDemoSession()
          return
        }
        throw error
      }
    },
    [startDemoSession],
  )

  const updateProfile = useCallback(async (fullName: string) => {
    const updated = await authApi.updateProfile({ full_name: fullName })
    setUser(updated)
  }, [])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword({ old_password: oldPassword, new_password: newPassword })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        isDemoSession,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { ApiError }
