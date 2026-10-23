import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'

/**
 * Route-level fallback for the dashboard group. It renders inside the app
 * shell, so only the content area is replaced while a segment streams in.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>

      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="mt-5 h-64 w-full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <Skeleton className="h-4 w-28" />
          <div className="mt-5">
            <SkeletonTable rows={5} columns={2} />
          </div>
        </div>
      </div>
    </div>
  )
}
