import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Breadcrumb = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: string
  description?: string
  /** Small uppercase label above the title, e.g. the module family. */
  eyebrow?: string
  breadcrumb?: Breadcrumb[]
  actions?: React.ReactNode
  /** Shows a "Demo data" chip when the page is rendering fallback fixtures. */
  demo?: boolean
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumb,
  actions,
  demo = false,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="transition-colors hover:text-foreground">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-foreground/80' : undefined}>{crumb.label}</span>
                  )}
                  {!isLast ? <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" /> : null}
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            {demo ? (
              <span className="rounded-md border border-warning/30 bg-warning-muted px-1.5 py-0.5 text-2xs font-medium text-warning">
                Demo data
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {children}
    </header>
  )
}
