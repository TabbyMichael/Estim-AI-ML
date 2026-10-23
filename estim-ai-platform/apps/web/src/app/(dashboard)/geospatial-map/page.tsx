'use client'

import nextDynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Building2, Globe2, MapPin, TrendingUp, Wallet } from 'lucide-react'
import type { GeoSite } from '@/components/geo-map-canvas'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Progress, ProgressRow } from '@/components/ui/progress'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { DEMO_PROJECTS, DEMO_SITES } from '@/lib/demo/projects'
import type { DemoSite, DemoProject, ProjectStatus } from '@/lib/demo/projects'
import { cn, formatCurrency, formatNumber, formatPercent, humanize } from '@/lib/utils'

// Leaflet reads `window` at module scope, so the canvas is browser-only.
const SiteMap = nextDynamic(() => import('@/components/geo-map-canvas'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
})

type SiteFilter = 'all' | DemoSite['status']

type SiteRow = DemoSite & {
  projects: DemoProject[]
  budget: number
  progress: number
}

const SITE_TONE: Record<DemoSite['status'], 'success' | 'info' | 'warning'> = {
  active: 'success',
  mobilizing: 'info',
  closing: 'warning',
}

const SITE_BAR_TONE: Record<DemoSite['status'], 'success' | 'info' | 'warning'> = {
  active: 'success',
  mobilizing: 'info',
  closing: 'warning',
}

const PROJECT_TONE: Record<ProjectStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  on_track: 'success',
  at_risk: 'warning',
  delayed: 'danger',
  completed: 'info',
}

const FILTER_OPTIONS: { value: SiteFilter; label: string }[] = [
  { value: 'all', label: 'All sites' },
  { value: 'active', label: 'Active' },
  { value: 'mobilizing', label: 'Mobilizing' },
  { value: 'closing', label: 'Closing' },
]

export default function GeospatialMapPage() {
  const [filter, setFilter] = useState<SiteFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_SITES[0]?.id ?? null)

  const siteRows = useMemo<SiteRow[]>(
    () =>
      DEMO_SITES.map((site) => {
        const projects = DEMO_PROJECTS.filter((project) => site.project_ids.includes(project.id))
        const budget = projects.reduce((sum, project) => sum + project.budget, 0)
        const progress =
          projects.length > 0
            ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
            : 0
        return { ...site, projects, budget, progress }
      }),
    [],
  )

  const filtered = useMemo(
    () => (filter === 'all' ? siteRows : siteRows.filter((site) => site.status === filter)),
    [siteRows, filter],
  )

  const selected = filtered.find((site) => site.id === selectedId) ?? filtered[0] ?? null

  const statusCounts = useMemo(() => {
    const counts: Record<DemoSite['status'], number> = { active: 0, mobilizing: 0, closing: 0 }
    siteRows.forEach((site) => {
      counts[site.status] += 1
    })
    return counts
  }, [siteRows])

  const portfolioValue = filtered.reduce((sum, site) => sum + site.budget, 0)
  const averageProgress =
    filtered.length > 0
      ? Math.round(filtered.reduce((sum, site) => sum + site.progress, 0) / filtered.length)
      : 0

  const mapSites: GeoSite[] = filtered.map((site) => ({
    id: site.id,
    name: site.name,
    lat: site.lat,
    lng: site.lng,
    status: site.status,
  }))

  const columns = useMemo<Column<SiteRow>[]>(
    () => [
      {
        id: 'site',
        header: 'Site',
        cell: (site) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{site.name}</p>
            <p className="truncate text-2xs text-muted-foreground">
              {site.location} · {site.id}
            </p>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (site) => (
          <Badge tone={SITE_TONE[site.status]} dot className="capitalize">
            {site.status}
          </Badge>
        ),
      },
      {
        id: 'projects',
        header: 'Projects',
        align: 'right',
        cell: (site) => (
          <div>
            <p className="tabular font-medium">{formatNumber(site.projects.length)}</p>
            <p className="truncate text-2xs text-muted-foreground">
              {site.projects.map((project) => project.code).join(', ') || '—'}
            </p>
          </div>
        ),
      },
      {
        id: 'budget',
        header: 'Portfolio',
        align: 'right',
        hideOnMobile: true,
        cell: (site) => (
          <span className="tabular">{formatCurrency(site.budget, { compact: true })}</span>
        ),
      },
      {
        id: 'progress',
        header: 'Completion',
        align: 'right',
        cell: (site) => (
          <div className="ml-auto flex w-28 items-center gap-2">
            <Progress
              value={site.progress}
              tone={SITE_BAR_TONE[site.status]}
              size="sm"
              label={`${site.name} completion`}
            />
            <span className="tabular w-9 text-right text-2xs text-muted-foreground">
              {site.progress}%
            </span>
          </div>
        ),
      },
      {
        id: 'coordinates',
        header: 'Coordinates',
        align: 'right',
        hideOnMobile: true,
        cell: (site) => (
          <span className="tabular text-2xs text-muted-foreground">
            {site.lat.toFixed(3)}, {site.lng.toFixed(3)}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Geospatial overview"
        description="Plot project sites on an interactive map, filter by delivery status and inspect the projects running at each location."
        demo
        actions={
          <SegmentedControl<SiteFilter>
            options={FILTER_OPTIONS}
            value={filter}
            onValueChange={setFilter}
            aria-label="Filter sites by status"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sites shown"
          value={formatNumber(filtered.length)}
          hint={`${siteRows.length} sites in the portfolio`}
          icon={Globe2}
        />
        <StatCard
          label="Active sites"
          value={formatNumber(statusCounts.active)}
          hint={`${statusCounts.mobilizing} mobilizing · ${statusCounts.closing} closing`}
          icon={Building2}
          tone="success"
        />
        <StatCard
          label="Portfolio value"
          value={formatCurrency(portfolioValue, { compact: true })}
          hint="Linked project budgets"
          icon={Wallet}
          tone="info"
        />
        <StatCard
          label="Avg. completion"
          value={formatPercent(averageProgress / 100)}
          hint="Mean progress across shown sites"
          icon={TrendingUp}
          tone="primary"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardToolbar
            title="Site map"
            description={`${filtered.length} of ${siteRows.length} sites plotted. Tiles load client-side from OpenStreetMap.`}
            actions={
              <Badge tone="outline">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                Client-only map
              </Badge>
            }
          />
          <CardContent>
            <div className="h-[420px] overflow-hidden rounded-lg border border-border">
              <SiteMap sites={mapSites} height={418} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-muted-foreground">
              {(Object.keys(SITE_TONE) as DemoSite['status'][]).map((status) => (
                <span key={status} className="flex items-center gap-1.5 capitalize">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      status === 'active' && 'bg-success',
                      status === 'mobilizing' && 'bg-info',
                      status === 'closing' && 'bg-warning',
                    )}
                    aria-hidden="true"
                  />
                  {status}
                  <span className="tabular text-foreground">{statusCounts[status]}</span>
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(Object.keys(SITE_TONE) as DemoSite['status'][]).map((status) => (
                <div key={status} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2 text-2xs">
                    <span className="capitalize text-muted-foreground">{status}</span>
                    <span className="tabular font-medium text-foreground">
                      {statusCounts[status]}
                    </span>
                  </div>
                  <Progress
                    value={statusCounts[status]}
                    max={siteRows.length}
                    tone={SITE_BAR_TONE[status]}
                    size="sm"
                    className="mt-2"
                    label={`${status} sites`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardToolbar
            title={selected ? selected.name : 'Site detail'}
            description={selected ? `${selected.location} · ${selected.id}` : 'Select a site from the map or table'}
            actions={
              selected ? (
                <Badge tone={SITE_TONE[selected.status]} dot className="capitalize">
                  {selected.status}
                </Badge>
              ) : undefined
            }
          />
          <CardContent>
            {selected ? (
              <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <dt className="text-2xs uppercase tracking-[0.12em] text-muted-foreground">
                      Portfolio
                    </dt>
                    <dd className="mt-1 tabular text-sm font-semibold text-foreground">
                      {formatCurrency(selected.budget, { compact: true })}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <dt className="text-2xs uppercase tracking-[0.12em] text-muted-foreground">
                      Projects
                    </dt>
                    <dd className="mt-1 tabular text-sm font-semibold text-foreground">
                      {selected.projects.length}
                    </dd>
                  </div>
                </dl>

                <ProgressRow
                  label="Average completion"
                  value={selected.progress}
                  tone={SITE_BAR_TONE[selected.status]}
                  hint={`${selected.progress}%`}
                />

                <div>
                  <p className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Projects on site
                  </p>
                  <ul className="mt-2 space-y-2">
                    {selected.projects.map((project) => (
                      <li
                        key={project.id}
                        className="rounded-lg border border-border/60 bg-muted/20 p-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-xs font-medium text-foreground">
                            {project.title}
                          </p>
                          <Badge tone={PROJECT_TONE[project.status]} size="sm">
                            {humanize(project.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-2xs text-muted-foreground">
                          {project.code} · {project.manager}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-2xs text-muted-foreground">
                  Coordinates {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={MapPin}
                title="No sites match"
                description="Change the status filter to plot other sites."
                compact
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(site) => site.id}
        onRowClick={(site) => setSelectedId(site.id)}
        pageSize={10}
        caption="Sites and linked projects"
        emptyTitle="No sites match the filter"
        emptyDescription="Reset the status filter to see every site."
        toolbar={
          <span className="text-xs text-muted-foreground">
            Select a row to inspect the site details.
          </span>
        }
      />
    </div>
  )
}
