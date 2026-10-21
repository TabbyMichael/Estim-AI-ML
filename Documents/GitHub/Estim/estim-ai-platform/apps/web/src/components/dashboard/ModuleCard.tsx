import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ACCENT_CLASSES, type ModuleMeta } from '@/config/modules'
import { cn } from '@/lib/utils'

/** Dashboard tile for one AI module: icon, promise, live state. */
export function ModuleCard({ module }: { module: ModuleMeta }) {
  const Icon = module.icon
  const accent = ACCENT_CLASSES[module.accent]

  return (
    <Link
      href={module.href}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card',
        'transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        accent.ring,
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl',
          accent.glow,
        )}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid h-9 w-9 place-items-center rounded-lg border [&_svg]:size-4',
            accent.chip,
          )}
        >
          <Icon aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success-muted px-1.5 py-0.5 text-[10px] font-medium leading-4 text-success">
          <span className="h-1 w-1 rounded-full bg-success" aria-hidden="true" />
          Live
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-tight text-foreground">{module.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{module.question}</p>

      <div className="mt-3 flex items-center justify-between text-2xs text-muted-foreground">
        <span>{module.shortTitle}</span>
        <ArrowUpRight
          className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
