'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type User = {
  id: string
  email: string
  full_name: string
  is_active: boolean
  roles: string[]
  created_at: string
  last_login_at?: string
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, full_name: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API}/auth/login`, { email, password })
    const { access_token, refresh_token } = response.data
    
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    
    // Set default auth header
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    
    // Fetch user data
    await refreshUser()
  }

  const register = async (email: string, password: string, full_name: string) => {
    await axios.post(`${API}/auth/register`, { email, password, full_name })
    // Auto-login after registration
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const refreshUser = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
    } catch (error) {
      logout()
    }
  }

  // Set up axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    return () => {
      axios.interceptors.request.eject(interceptor)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
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
