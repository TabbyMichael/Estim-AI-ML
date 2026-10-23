'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  /** User preference, may be 'system'. */
  theme: Theme
  /** Preference resolved against the OS setting. */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

/**
 * The inline boot script in `app/layout.tsx` applies the theme class before
 * first paint; this provider adopts whatever it decided and keeps it in sync
 * afterwards, so there is no flash of the wrong theme and no hydration
 * mismatch on the initial render.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')

  const apply = useCallback((next: Theme) => {
    const nextResolved = resolve(next)
    const root = document.documentElement
    root.classList.toggle('dark', nextResolved === 'dark')
    root.style.colorScheme = nextResolved
    root.dataset.theme = nextResolved
    setResolvedTheme(nextResolved)
  }, [])

  // Adopt the boot-script decision after hydration. Dark is the product
  // default; 'system' is an explicit choice the user can opt into.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const next: Theme = isTheme(stored) ? stored : 'dark'
    setThemeState(next)
    apply(next)
  }, [apply])

  // Follow OS changes while the preference is 'system'.
  useEffect(() => {
    if (theme !== 'system') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme, apply])

  const setTheme = useCallback(
    (next: Theme) => {
      window.localStorage.setItem(STORAGE_KEY, next)
      setThemeState(next)
      apply(next)
    },
    [apply],
  )

  const toggleTheme = useCallback(() => {
    setTheme(resolve(theme) === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
