/** Maintenance fixtures: equipment register + health reports. */

import type {
  Equipment,
  EquipmentHealth,
  EquipmentList,
  MaintenancePrediction,
  MaintenanceRiskLevel,
} from '../api/maintenance'
import { daysAgo } from './seed'

type EquipmentSeed = {
  name: string
  type: string
  site: string
  status: string
  hours: number
  risk: MaintenanceRiskLevel | null
  critical: boolean
  mtbf: number
  needs: boolean
}

const SEEDS: EquipmentSeed[] = [
  { name: 'Tower Crane TC-04', type: 'tower_crane', site: 'SITE-RIV', status: 'operational', hours: 6_420, risk: 'low', critical: false, mtbf: 1_840, needs: false },
  { name: 'Concrete Pump CP-11', type: 'concrete_pump', site: 'SITE-RIV', status: 'operational', hours: 4_180, risk: 'medium', critical: false, mtbf: 940, needs: true },
  { name: 'Excavator EX-220', type: 'excavator', site: 'SITE-NGL', status: 'maintenance', hours: 8_960, risk: 'high', critical: false, mtbf: 620, needs: true },
  { name: 'Piling Rig PR-07', type: 'piling_rig', site: 'SITE-NGL', status: 'operational', hours: 5_310, risk: 'medium', critical: false, mtbf: 1_120, needs: false },
  { name: 'Chiller CH-02', type: 'chiller', site: 'SITE-HBR', status: 'operational', hours: 12_640, risk: 'high', critical: true, mtbf: 410, needs: true },
  { name: 'Backup Generator GEN-3', type: 'generator', site: 'SITE-HBR', status: 'operational', hours: 3_220, risk: 'low', critical: false, mtbf: 2_260, needs: false },
  { name: 'Boom Lift BL-14', type: 'boom_lift', site: 'SITE-MER', status: 'operational', hours: 2_480, risk: 'low', critical: false, mtbf: 1_510, needs: false },
  { name: 'Welding Rig WR-09', type: 'welding_rig', site: 'SITE-MER', status: 'offline', hours: 7_880, risk: 'critical', critical: true, mtbf: 280, needs: true },
  { name: 'Pile Driver PD-01', type: 'piling_rig', site: 'SITE-ATL', status: 'operational', hours: 4_640, risk: 'medium', critical: false, mtbf: 980, needs: false },
  { name: 'Telehandler TH-06', type: 'telehandler', site: 'SITE-ATL', status: 'operational', hours: 3_910, risk: 'low', critical: false, mtbf: 1_720, needs: false },
  { name: 'Crawler Crane CC-03', type: 'crawler_crane', site: 'SITE-CRB', status: 'operational', hours: 9_240, risk: 'high', critical: false, mtbf: 540, needs: true },
  { name: 'Compressor AC-08', type: 'compressor', site: 'SITE-CRB', status: 'operational', hours: 6_050, risk: 'medium', critical: false, mtbf: 860, needs: false },
]

export const DEMO_EQUIPMENT: Equipment[] = SEEDS.map((seed, index) => ({
  id: `eq-${index + 1}`,
  name: seed.name,
  equipment_type: seed.type,
  site_id: seed.site,
  status: seed.status,
  operating_hours: seed.hours,
  created_at: daysAgo(400 - index * 12),
}))

export const DEMO_EQUIPMENT_HEALTH: Record<string, EquipmentHealth> = Object.fromEntries(
  DEMO_EQUIPMENT.map((equipment, index) => {
    const seed = SEEDS[index]
    return [
      equipment.id,
      {
        equipment_id: equipment.id,
        status: equipment.status,
        operating_hours: equipment.operating_hours,
        needs_maintenance: seed.needs,
        mtbf_hours: seed.mtbf,
        latest_risk: seed.risk,
        critical: seed.critical,
      },
    ]
  }),
)

export const DEMO_EQUIPMENT_LIST: EquipmentList = {
  equipment: DEMO_EQUIPMENT,
  total: DEMO_EQUIPMENT.length,
  skip: 0,
  limit: 100,
}

/** Predictions keyed by equipment id, only for the risky assets. */
export const DEMO_MAINTENANCE_PREDICTIONS: MaintenancePrediction[] = (
  ['eq-3', 'eq-5', 'eq-8', 'eq-11'] as const
).map((equipmentId, index) => {
  const probabilities = [0.78, 0.64, 0.91, 0.57]
  const risks: MaintenanceRiskLevel[] = ['high', 'high', 'critical', 'medium']
  return {
    id: `mp-${index + 1}`,
    equipment_id: equipmentId,
    failure_probability: probabilities[index],
    risk_level: risks[index],
    horizon_days: 30,
    model_version: 'v3.1.0',
    created_at: daysAgo(index + 1),
    notes: null,
  }
})

/** Derived health score (0-100) — the backend exposes risk signals, not a score. */
export function demoHealthScore(health: EquipmentHealth): number {
  let score = 100
  if (health.latest_risk === 'medium') score -= 22
  if (health.latest_risk === 'high') score -= 42
  if (health.latest_risk === 'critical') score -= 65
  if (health.needs_maintenance) score -= 8
  if (health.critical) score -= 5
  return Math.max(8, score)
}

/** Equipment health-band distribution for the maintenance chart. */
export const DEMO_EQUIPMENT_HEALTH_BANDS = [
  { band: '90-100', count: 4 },
  { band: '70-89', count: 3 },
  { band: '50-69', count: 3 },
  { band: '30-49', count: 1 },
  { band: '0-29', count: 1 },
]
