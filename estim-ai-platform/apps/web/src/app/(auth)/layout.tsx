'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, FileSearch, ShieldCheck, TrendingUp } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { useAuth } from '@/lib/auth-context'

const VALUE_PROPS = [
  {
    icon: FileSearch,
    title: 'Document intelligence',
    description: 'Ask questions across contracts, drawings and reports in plain language.',
  },
  {
    icon: TrendingUp,
    title: 'Forecast before you spend',
    description: 'Cost and demand predictions with confidence intervals, not gut feel.',
  },
  {
    icon: ShieldCheck,
    title: 'Catch anomalies early',
    description: 'Procurement fraud and price outliers surfaced before approval.',
  },
]

const PROOF_POINTS = [
  { value: '7', label: 'AI modules' },
  { value: '94%', label: 'On-time delivery' },
  { value: '<2s', label: 'Risk scoring' },
]

/**
 * Shared chrome for `/login` and `/register`: an always-dark brand panel on the
 * left, the form on the right. Authenticated users are bounced to the dashboard
 * (or to their `next` destination).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    router.replace(next && next.startsWith('/') ? next : '/')
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-[#080a14] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-brand-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />

        <div className="relative">
          <Logo size="lg" />
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-2xs font-medium uppercase tracking-[0.16em] text-white/70">
            <Activity className="h-3 w-3 text-emerald-400" />
            Live operational intelligence
          </p>
          <h1 className="text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-white">
            Construction intelligence,
            <span className="block bg-gradient-to-r from-brand-300 via-brand-200 to-white bg-clip-text text-transparent">
              without the guesswork.
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            One workspace for procurement, cost forecasting, inventory, maintenance and risk —
            connected to your ERP and updated in real time.
          </p>

          <ul className="mt-10 space-y-5">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white/90">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/50">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <dl className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {PROOF_POINTS.map((point) => (
            <div key={point.label}>
              <dt className="text-2xs uppercase tracking-[0.14em] text-white/40">{point.label}</dt>
              <dd className="mt-1.5 text-xl font-semibold tabular text-white">{point.value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
        <p className="text-center text-2xs text-muted-foreground">
          © {new Date().getFullYear()} Estim AI · Secure workspace access
        </p>
      </main>
    </div>
  )
}
