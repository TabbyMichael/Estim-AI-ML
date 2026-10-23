/**
 * Project + site catalogue.
 *
 * The backend has no project/site listing endpoint, so this fixture is the
 * single source used by the dashboard, module pages, Gantt and map — in demo
 * *and* live mode.
 */

import type { Milestone, ProjectHealth, RiskPrediction } from '../api/risk'
import { daysAgo, daysFromNow } from './seed'

export type ProjectStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed'

export type DemoProject = {
  id: string
  code: string
  title: string
  client: string
  manager: string
  site_id: string
  site_name: string
  location: string
  lat: number
  lng: number
  status: ProjectStatus
  budget: number
  spent: number
  progress: number
  risk_score: number
  start_date: string
  end_date: string
}

export type DemoSite = {
  id: string
  name: string
  location: string
  lat: number
  lng: number
  project_ids: string[]
  status: 'active' | 'mobilizing' | 'closing'
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'prj-1001',
    code: 'PRJ-1001',
    title: 'Riverside Tower',
    client: 'Meridian Construction',
    manager: 'Dana Whitfield',
    site_id: 'SITE-RIV',
    site_name: 'Riverside Campus',
    location: 'Chicago, IL',
    lat: 41.8781,
    lng: -87.6298,
    status: 'on_track',
    budget: 148_000_000,
    spent: 92_400_000,
    progress: 64,
    risk_score: 22,
    start_date: '2025-03-01',
    end_date: '2027-02-28',
  },
  {
    id: 'prj-1002',
    code: 'PRJ-1002',
    title: 'Northgate Logistics Hub',
    client: 'Northgate Industrial',
    manager: 'Marcus Lee',
    site_id: 'SITE-NGL',
    site_name: 'Northgate Yard',
    location: 'Dallas, TX',
    lat: 32.7767,
    lng: -96.797,
    status: 'at_risk',
    budget: 62_500_000,
    spent: 41_800_000,
    progress: 58,
    risk_score: 68,
    start_date: '2025-06-15',
    end_date: '2026-12-15',
  },
  {
    id: 'prj-1003',
    code: 'PRJ-1003',
    title: 'Harbor Desalination Plant',
    client: 'AquaCore Utilities',
    manager: 'Priya Raman',
    site_id: 'SITE-HBR',
    site_name: 'Harbor Works',
    location: 'Long Beach, CA',
    lat: 33.7701,
    lng: -118.1937,
    status: 'on_track',
    budget: 214_000_000,
    spent: 121_300_000,
    progress: 52,
    risk_score: 31,
    start_date: '2024-11-01',
    end_date: '2027-06-30',
  },
  {
    id: 'prj-1004',
    code: 'PRJ-1004',
    title: 'Meridian Hospital Wing',
    client: 'Meridian Health',
    manager: 'Elena Vasquez',
    site_id: 'SITE-MER',
    site_name: 'Meridian Medical Center',
    location: 'Austin, TX',
    lat: 30.2672,
    lng: -97.7431,
    status: 'delayed',
    budget: 87_200_000,
    spent: 69_500_000,
    progress: 71,
    risk_score: 84,
    start_date: '2024-08-01',
    end_date: '2026-09-30',
  },
  {
    id: 'prj-1005',
    code: 'PRJ-1005',
    title: 'Atlas Solar Farm',
    client: 'Atlas Renewables',
    manager: 'Tomás Ferreira',
    site_id: 'SITE-ATL',
    site_name: 'Atlas Solar Fields',
    location: 'Phoenix, AZ',
    lat: 33.4484,
    lng: -112.074,
    status: 'on_track',
    budget: 96_000_000,
    spent: 38_600_000,
    progress: 41,
    risk_score: 18,
    start_date: '2025-09-01',
    end_date: '2027-08-31',
  },
  {
    id: 'prj-1006',
    code: 'PRJ-1006',
    title: 'Cedar Ridge Bridge',
    client: 'State Infrastructure Authority',
    manager: 'Aisha Bello',
    site_id: 'SITE-CRB',
    site_name: 'Cedar Ridge Crossing',
    location: 'Denver, CO',
    lat: 39.7392,
    lng: -104.9903,
    status: 'at_risk',
    budget: 45_800_000,
    spent: 30_100_000,
    progress: 66,
    risk_score: 57,
    start_date: '2025-01-15',
    end_date: '2026-11-30',
  },
]

export const DEMO_SITES: DemoSite[] = DEMO_PROJECTS.map((project) => ({
  id: project.site_id,
  name: project.site_name,
  location: project.location,
  lat: project.lat,
  lng: project.lng,
  project_ids: [project.id],
  status: project.status === 'completed' ? 'closing' : project.progress < 10 ? 'mobilizing' : 'active',
}))

export function demoProject(id: string): DemoProject {
  return DEMO_PROJECTS.find((project) => project.id === id) ?? DEMO_PROJECTS[0]
}

/* ------------------------------------------------------------------ */
/* Milestones                                                          */
/* ------------------------------------------------------------------ */

function buildMilestones(
  projectId: string,
  names: string[],
  done: number,
  startOffset: number,
  progress: number,
): Milestone[] {
  return names.map((name, index) => {
    const offset = startOffset + index * 45
    const status =
      index < done ? 'completed' : index === done ? 'in_progress' : 'not_started'
    const fraction = index < done ? 100 : index === done ? progress : 0
    return {
      id: `${projectId}-ms-${index + 1}`,
      project_id: projectId,
      name,
      planned_start: daysFromNow(offset),
      planned_end: daysFromNow(offset + 40),
      status,
      progress_pct: fraction,
    }
  })
}

export const DEMO_MILESTONES: Record<string, Milestone[]> = {
  'prj-1001': buildMilestones(
    'prj-1001',
    ['Permits & enabling works', 'Foundation & substructure', 'Structural frame', 'Facade & envelope', 'MEP first fix', 'Fit-out & handover'],
    2,
    -180,
    72,
  ),
  'prj-1002': buildMilestones(
    'prj-1002',
    ['Site mobilisation', 'Earthworks & grading', 'Steel erection', 'Roof & cladding', 'Dock equipment install', 'Commissioning'],
    2,
    -120,
    41,
  ),
  'prj-1003': buildMilestones(
    'prj-1003',
    ['Marine intake works', 'Pre-treatment plant', 'Reverse osmosis trains', 'Outfall pipeline', 'Controls & SCADA', 'Performance testing'],
    1,
    -240,
    58,
  ),
  'prj-1004': buildMilestones(
    'prj-1004',
    ['Demolition & site prep', 'Structure & shell', 'Medical gas rough-in', 'Operating theatres', 'Ward fit-out', 'Certification'],
    2,
    -330,
    35,
  ),
  'prj-1005': buildMilestones(
    'prj-1005',
    ['Land preparation', 'Pile driving', 'Tracker assembly', 'Inverter stations', 'Grid interconnection', 'Commissioning'],
    1,
    -60,
    48,
  ),
  'prj-1006': buildMilestones(
    'prj-1006',
    ['Riverbed surveys', 'Pier construction', 'Deck erection', 'Approaches & ramps', 'Road surfacing', 'Load testing'],
    3,
    -200,
    85,
  ),
}

export function demoMilestones(projectId: string): Milestone[] {
  return DEMO_MILESTONES[projectId] ?? []
}

/* ------------------------------------------------------------------ */
/* Risk                                                               */
/* ------------------------------------------------------------------ */

export const DEMO_RISK_PREDICTIONS: Record<string, RiskPrediction[]> = Object.fromEntries(
  DEMO_PROJECTS.map((project, index) => {
    const milestones = demoMilestones(project.id)
    const severity: RiskPrediction['risk_level'][] =
      project.risk_score > 75
        ? ['critical', 'high']
        : project.risk_score > 50
          ? ['high', 'medium']
          : ['low', 'medium']
    const predictions = milestones.slice(0, 3).map((milestone, position) => ({
      id: `${project.id}-pred-${position + 1}`,
      project_id: project.id,
      milestone_id: milestone.id,
      delay_probability: Math.min(
        0.95,
        Math.max(0.05, project.risk_score / 100 - position * 0.08 + (index % 3) * 0.02),
      ),
      predicted_delay_days: Math.round((project.risk_score / 100) * (14 - position * 3)),
      risk_level: severity[position % severity.length],
      model_version: 'v2.4.1',
      created_at: daysAgo(position * 2 + 1),
      notes: null,
    }))
    return [project.id, predictions]
  }),
)

export function demoProjectHealth(projectId: string): ProjectHealth {
  const project = demoProject(projectId)
  const milestones = demoMilestones(projectId)
  const overdue = milestones.filter(
    (milestone) => milestone.status !== 'completed' && new Date(milestone.planned_end) < new Date(),
  ).length
  const health: ProjectHealth['health'] =
    project.risk_score > 75
      ? 'critical'
      : project.risk_score > 50
        ? 'high'
        : project.risk_score > 30
          ? 'medium'
          : 'low'
  return {
    project_id: projectId,
    health,
    overdue_count: overdue,
    milestone_count: milestones.length,
    prediction_count: (DEMO_RISK_PREDICTIONS[projectId] ?? []).length,
  }
}

/** Spend vs forecast series used by the dashboard and forecasting page. */
export const DEMO_SPEND_SERIES = [
  { period: 'Apr', actual: 6.1, forecast: 6.4 },
  { period: 'May', actual: 7.8, forecast: 7.6 },
  { period: 'Jun', actual: 8.9, forecast: 8.8 },
  { period: 'Jul', actual: 9.6, forecast: 9.4 },
  { period: 'Aug', actual: 10.8, forecast: 10.2 },
  { period: 'Sep', actual: 11.4, forecast: 11.1 },
  { period: 'Oct', actual: 10.2, forecast: 11.8 },
  { period: 'Nov', actual: null, forecast: 12.4 },
  { period: 'Dec', actual: null, forecast: 13.1 },
]

/** Project health distribution for the overview donut. */
export const DEMO_HEALTH_DISTRIBUTION = [
  { name: 'On track', value: 3, tone: 'success' as const },
  { name: 'At risk', value: 2, tone: 'warning' as const },
  { name: 'Delayed', value: 1, tone: 'danger' as const },
]
