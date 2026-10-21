'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertOctagon, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Error boundary for the dashboard group. The shell (sidebar/topbar) stays
 * usable; only the failing segment is replaced with recovery actions.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the failure in the browser console for local debugging.
    console.error('Dashboard segment failed:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card
        role="alert"
        className="w-full max-w-md p-6 text-center shadow-elevated"
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-destructive/25 bg-destructive-muted text-destructive">
          <AlertOctagon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">This view failed to load</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          The module hit an unexpected error. Retry the request, or head back to the
          dashboard if the problem persists.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-2xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
