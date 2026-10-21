import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/** 404 state for unknown dashboard routes; keeps the app shell intact. */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-3">
        <p className="text-center text-2xs font-semibold uppercase tracking-[0.16em] text-primary">
          404 — Not found
        </p>
        <EmptyState
          icon={Compass}
          title="This page does not exist"
          description="The link may be outdated, or the module might have moved. Use the navigation or jump back to the dashboard."
          action={
            <Button asChild variant="outline">
              <Link href="/">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}
