import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/** Global 404 for routes outside the authenticated app shell. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md space-y-3">
        <p className="text-center text-2xs font-semibold uppercase tracking-[0.16em] text-primary">
          Estim AI — 404
        </p>
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="We could not find the page you were looking for. Sign in to reach the workspace, or return to the dashboard."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/">Open dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          }
        />
      </div>
    </main>
  )
}
