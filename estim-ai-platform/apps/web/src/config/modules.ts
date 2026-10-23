import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Boxes,
  FileText,
  GanttChartSquare,
  Map,
  ScanEye,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import type { StatTone } from '@/components/ui/stat-card'

export type ModuleAccent = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'cyan'

export type ModuleMeta = {
  id: string
  title: string
  shortTitle: string
  description: string
  href: string
  icon: LucideIcon
  accent: ModuleAccent
  tone: StatTone
  /** What the module answers, shown on the dashboard card. */
  question: string
}

/**
 * Shared metadata for the seven AI modules. Used by the dashboard grid,
 * sidebar descriptions, breadcrumbs and the command palette so titles and
 * copy never drift between surfaces.
 */
export const MODULES: ModuleMeta[] = [
  {
    id: 'procurement',
    title: 'Procurement AI',
    shortTitle: 'Procurement',
    description: 'Fraud detection and price anomaly analysis across purchase orders.',
    href: '/procurement',
    icon: ShoppingCart,
    accent: 'warning',
    tone: 'warning',
    question: 'Which purchase orders look wrong?',
  },
  {
    id: 'cost-forecasting',
    title: 'Cost Forecasting',
    shortTitle: 'Forecasting',
    description: 'Spend predictions with confidence intervals and variance tracking.',
    href: '/cost-forecasting',
    icon: TrendingUp,
    accent: 'primary',
    tone: 'primary',
    question: 'Where will the budget land?',
  },
  {
    id: 'inventory',
    title: 'Inventory AI',
    shortTitle: 'Inventory',
    description: 'Demand forecasting and stockout prevention across sites.',
    href: '/inventory',
    icon: Boxes,
    accent: 'success',
    tone: 'success',
    question: 'What will run out next?',
  },
  {
    id: 'maintenance',
    title: 'Predictive Maintenance',
    shortTitle: 'Maintenance',
    description: 'Equipment health scoring and failure probability by horizon.',
    href: '/maintenance',
    icon: Wrench,
    accent: 'info',
    tone: 'info',
    question: 'Which equipment fails next?',
  },
  {
    id: 'project-risk',
    title: 'Project Risk',
    shortTitle: 'Risk',
    description: 'Milestone delay probability and mitigation signals per project.',
    href: '/project-risk',
    icon: ShieldAlert,
    accent: 'danger',
    tone: 'danger',
    question: 'Which milestones slip?',
  },
  {
    id: 'visual-inspection',
    title: 'Visual Inspection',
    shortTitle: 'Inspection',
    description: 'Defect detection from site imagery with severity scoring.',
    href: '/visual-inspection',
    icon: ScanEye,
    accent: 'violet',
    tone: 'neutral',
    question: 'Where is quality slipping?',
  },
  {
    id: 'documents',
    title: 'Document AI',
    shortTitle: 'Documents',
    description: 'Index contracts and drawings, then ask questions in plain language.',
    href: '/documents',
    icon: FileText,
    accent: 'cyan',
    tone: 'info',
    question: 'What do the documents say?',
  },
]

export type QuickLink = {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

export const QUICK_LINKS: QuickLink[] = [
  {
    title: 'Reports',
    description: 'Generate and schedule',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Gantt',
    description: 'Milestone timeline',
    href: '/gantt',
    icon: GanttChartSquare,
  },
  {
    title: 'Sites',
    description: 'Geospatial overview',
    href: '/geospatial-map',
    icon: Map,
  },
]

/** Tailwind-friendly accent utilities per module. */
export const ACCENT_CLASSES: Record<ModuleAccent, { chip: string; ring: string; glow: string }> = {
  primary: {
    chip: 'border-primary/25 bg-primary-muted text-primary',
    ring: 'group-hover:border-primary/40',
    glow: 'from-primary/20',
  },
  success: {
    chip: 'border-success/25 bg-success-muted text-success',
    ring: 'group-hover:border-success/40',
    glow: 'from-success/20',
  },
  warning: {
    chip: 'border-warning/25 bg-warning-muted text-warning',
    ring: 'group-hover:border-warning/40',
    glow: 'from-warning/20',
  },
  danger: {
    chip: 'border-destructive/25 bg-destructive-muted text-destructive',
    ring: 'group-hover:border-destructive/40',
    glow: 'from-destructive/20',
  },
  info: {
    chip: 'border-info/25 bg-info-muted text-info',
    ring: 'group-hover:border-info/40',
    glow: 'from-info/20',
  },
  violet: {
    chip: 'border-violet-500/25 bg-violet-500/10 text-violet-500 dark:text-violet-400',
    ring: 'group-hover:border-violet-500/40',
    glow: 'from-violet-500/20',
  },
  cyan: {
    chip: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    ring: 'group-hover:border-cyan-500/40',
    glow: 'from-cyan-500/20',
  },
}

export function moduleByHref(href: string): ModuleMeta | undefined {
  return MODULES.find((module) => module.href === href)
}
