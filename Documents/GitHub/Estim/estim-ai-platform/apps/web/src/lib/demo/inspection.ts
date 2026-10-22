/** Visual inspection fixtures. */

import type { Inspection, InspectionList, InspectionSummary } from '../api/inspection'
import { daysAgo, hoursAgo } from './seed'

type InspectionSeed = {
  project: string
  site: string
  title: string
  status: string
  created: string
  detections: number
  severity: string
  rework: boolean
  defects: Record<string, number>
}

const SEEDS: InspectionSeed[] = [
  {
    project: 'prj-1001',
    site: 'SITE-RIV',
    title: 'Level 12 slab pour — pre-cover check',
    status: 'completed',
    created: hoursAgo(6),
    detections: 4,
    severity: 'high',
    rework: true,
    defects: { crack: 2, honeycomb: 1, exposed_rebar: 1 },
  },
  {
    project: 'prj-1002',
    site: 'SITE-NGL',
    title: 'Structural steel welds — bay 4',
    status: 'completed',
    created: daysAgo(1),
    detections: 2,
    severity: 'medium',
    rework: false,
    defects: { porosity: 1, undercut: 1 },
  },
  {
    project: 'prj-1004',
    site: 'SITE-MER',
    title: 'Medical gas corridor — drywall finish',
    status: 'in_review',
    created: daysAgo(1),
    detections: 6,
    severity: 'high',
    rework: true,
    defects: { crack: 3, misalignment: 2, moisture: 1 },
  },
  {
    project: 'prj-1003',
    site: 'SITE-HBR',
    title: 'RO train 2 — pipe support survey',
    status: 'completed',
    created: daysAgo(2),
    detections: 1,
    severity: 'low',
    rework: false,
    defects: { corrosion: 1 },
  },
  {
    project: 'prj-1006',
    site: 'SITE-CRB',
    title: 'Deck segment D-14 — surface scan',
    status: 'completed',
    created: daysAgo(3),
    detections: 3,
    severity: 'medium',
    rework: false,
    defects: { spalling: 2, crack: 1 },
  },
  {
    project: 'prj-1005',
    site: 'SITE-ATL',
    title: 'Tracker row 22 — torque verification',
    status: 'scheduled',
    created: daysAgo(4),
    detections: 0,
    severity: 'none',
    rework: false,
    defects: {},
  },
  {
    project: 'prj-1001',
    site: 'SITE-RIV',
    title: 'Curtain wall unit CW-118 — glazing QC',
    status: 'completed',
    created: daysAgo(5),
    detections: 2,
    severity: 'medium',
    rework: false,
    defects: { sealant_gap: 1, scratch: 1 },
  },
  {
    project: 'prj-1002',
    site: 'SITE-NGL',
    title: 'Dock pit slab — flatness check',
    status: 'in_review',
    created: daysAgo(6),
    detections: 5,
    severity: 'critical',
    rework: true,
    defects: { delamination: 3, crack: 2 },
  },
  {
    project: 'prj-1004',
    site: 'SITE-MER',
    title: 'Operating theatre 3 — ceiling grid',
    status: 'completed',
    created: daysAgo(8),
    detections: 1,
    severity: 'low',
    rework: false,
    defects: { misalignment: 1 },
  },
]

export const DEMO_INSPECTIONS: Inspection[] = SEEDS.map((seed, index) => ({
  id: `insp-${index + 1}`,
  project_id: seed.project,
  site_id: seed.site,
  title: seed.title,
  status: seed.status,
  created_by: 'usr-admin',
  created_at: seed.created,
}))

export const DEMO_INSPECTION_SUMMARIES: Record<string, InspectionSummary> = Object.fromEntries(
  DEMO_INSPECTIONS.map((inspection, index) => {
    const seed = SEEDS[index]
    return [
      inspection.id,
      {
        inspection_id: inspection.id,
        status: inspection.status,
        detection_count: seed.detections,
        worst_severity: seed.severity,
        needs_rework: seed.rework,
      },
    ]
  }),
)

export const DEMO_INSPECTION_LIST: InspectionList = {
  inspections: DEMO_INSPECTIONS,
  total: DEMO_INSPECTIONS.length,
  skip: 0,
  limit: 100,
}

/** Defects grouped by type across all completed inspections. */
export const DEMO_DEFECT_BREAKDOWN = [
  { type: 'Crack', count: 8 },
  { type: 'Delamination', count: 3 },
  { type: 'Honeycomb', count: 2 },
  { type: 'Exposed rebar', count: 2 },
  { type: 'Misalignment', count: 3 },
  { type: 'Corrosion', count: 1 },
]

/** Detection volume over the last 8 weeks. */
export const DEMO_INSPECTION_TREND = [
  { week: 'W31', inspections: 6, defects: 9 },
  { week: 'W32', inspections: 8, defects: 12 },
  { week: 'W33', inspections: 5, defects: 6 },
  { week: 'W34', inspections: 9, defects: 14 },
  { week: 'W35', inspections: 7, defects: 8 },
  { week: 'W36', inspections: 11, defects: 15 },
  { week: 'W37', inspections: 8, defects: 7 },
  { week: 'W38', inspections: 6, defects: 5 },
]
