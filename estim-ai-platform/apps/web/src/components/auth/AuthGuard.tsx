'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

function AuthLoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-sidebar shrink-0 border-r border-border bg-surface p-4 lg:block">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mt-10 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-9 animate-pulse rounded-lg bg-muted"
              style={{ animationDelay: `${index * 60}ms` }}
            />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-topbar items-center justify-between border-b border-border px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="flex-1 space-y-6 p-6">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}

/**
 * Client-side route protection for the dashboard group. Renders a full shell
 * skeleton while the session is being restored, then redirects to `/login`
 * with a `next` parameter so the user lands back where they intended.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading || isAuthenticated) return
    const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''
    router.replace(`/login${next}`)
  }, [isAuthenticated, isLoading, pathname, router])

  if (isLoading || !isAuthenticated) {
    return <AuthLoadingSkeleton />
  }

  return <>{children}</>
}
