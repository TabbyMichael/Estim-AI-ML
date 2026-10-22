import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Boxes,
  FileText,
  GanttChartSquare,
  LayoutDashboard,
  LineChart,
  Map,
  ScanEye,
  ScrollText,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  description?: string
  /** Only visible to users holding at least one of these roles (case-insensitive). */
  roles?: string[]
}

export type NavSection = {
  id: string
  label: string
  items: NavItem[]
}

/**
 * Single source of truth for navigation, breadcrumbs and the command palette.
 * Adding a page means adding one entry here.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        description: 'Operational snapshot across every module',
      },
    ],
  },
  {
    id: 'ai-modules',
    label: 'AI Modules',
    items: [
      {
        label: 'Procurement',
        href: '/procurement',
        icon: ShoppingCart,
        description: 'Purchase orders, anomalies and fraud signals',
      },
      {
        label: 'Cost Forecasting',
        href: '/cost-forecasting',
        icon: TrendingUp,
        description: 'Forecast spend, approve models, track variance',
      },
      {
        label: 'Inventory',
        href: '/inventory',
        icon: Boxes,
        description: 'Stock snapshots, demand forecasts and stockouts',
      },
      {
        label: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        description: 'Equipment health and failure predictions',
      },
      {
        label: 'Project Risk',
        href: '/project-risk',
        icon: ShieldAlert,
        description: 'Milestone risk, delay probability and mitigation',
      },
      {
        label: 'Visual Inspection',
        href: '/visual-inspection',
        icon: ScanEye,
        description: 'Defect detections from site imagery',
      },
      {
        label: 'Document AI',
        href: '/documents',
        icon: FileText,
        description: 'Upload, index and ask questions across documents',
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        description: 'Generate and schedule operational reports',
      },
      {
        label: 'Time Series',
        href: '/reports/time-series',
        icon: LineChart,
        description: 'Trend exploration across reporting periods',
      },
      {
        label: 'Charts',
        href: '/charts',
        icon: LineChart,
        description: 'Chart gallery and dataset explorer',
      },
      {
        label: 'Gantt',
        href: '/gantt',
        icon: GanttChartSquare,
        description: 'Milestone timeline and progress',
      },
      {
        label: 'Sites',
        href: '/geospatial-map',
        icon: Map,
        description: 'Geospatial view of projects and sites',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell,
        description: 'Delivery history and channel preferences',
      },
      {
        label: 'Audit Log',
        href: '/audit',
        icon: ScrollText,
        description: 'Immutable trail of platform activity',
      },
      {
        label: 'Admin',
        href: '/admin/users',
        icon: Users,
        description: 'Users, roles and permissions',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        label: 'Profile',
        href: '/profile',
        icon: UserCircle,
        description: 'Your account, preferences and security',
      },
    ],
  },
]

export function isAdmin(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false
  return roles.some((role) => role.toLowerCase() === 'admin')
}

export function canAccess(item: NavItem, roles: string[] | undefined | null): boolean {
  if (!item.roles || item.roles.length === 0) return true
  if (!roles) return false
  const owned = roles.map((role) => role.toLowerCase())
  return item.roles.some((role) => owned.includes(role.toLowerCase()))
}

export function filterNavigation(sections: NavSection[], roles: string[] | undefined | null): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(item, roles)),
    }))
    .filter((section) => section.items.length > 0)
}

export type NavMatch = {
  section: NavSection
  item: NavItem
}

/** Longest-prefix match so nested routes light up the right nav entry. */
export function findNavMatch(pathname: string): NavMatch | null {
  let best: NavMatch | null = null

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const isRoot = item.href === '/'
      const matches = isRoot ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)
      if (!matches) continue
      if (!best || item.href.length > best.item.href.length) {
        best = { section, item }
      }
    }
  }

  return best
}
