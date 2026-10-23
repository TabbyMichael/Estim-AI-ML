/** Inventory fixtures: stock snapshots, demand forecasts, stockout checks. */

import type {
  DemandForecast,
  DemandForecastList,
  StockSnapshot,
  StockSnapshotList,
  StockoutCheck,
} from '../api/inventory'
import { daysAgo } from './seed'

type SnapshotSeed = {
  material: string
  site: string
  qty: number
  unit: string
  reorder: number
  days: number
}

const SEEDS: SnapshotSeed[] = [
  { material: 'MAT-CONC-40', site: 'SITE-RIV', qty: 1420, unit: 'm3', reorder: 400, days: 1 },
  { material: 'MAT-REBAR-16', site: 'SITE-RIV', qty: 86, unit: 't', reorder: 30, days: 1 },
  { material: 'MAT-STEEL-IPE', site: 'SITE-NGL', qty: 118, unit: 't', reorder: 45, days: 2 },
  { material: 'MAT-BOLT-M20', site: 'SITE-NGL', qty: 12_400, unit: 'pcs', reorder: 5_000, days: 2 },
  { material: 'MAT-HDPE-630', site: 'SITE-HBR', qty: 340, unit: 'm', reorder: 250, days: 3 },
  { material: 'MAT-GYPSUM-15', site: 'SITE-MER', qty: 620, unit: 'pcs', reorder: 800, days: 3 },
  { material: 'MAT-HVAC-AHU', site: 'SITE-MER', qty: 4, unit: 'units', reorder: 2, days: 4 },
  { material: 'MAT-INSUL-PIR', site: 'SITE-NGL', qty: 210, unit: 'pcs', reorder: 300, days: 4 },
  { material: 'MAT-PILE-H300', site: 'SITE-ATL', qty: 96, unit: 'pcs', reorder: 60, days: 5 },
  { material: 'MAT-INV-2MW', site: 'SITE-ATL', qty: 2, unit: 'units', reorder: 3, days: 6 },
  { material: 'MAT-CABLE-PT', site: 'SITE-CRB', qty: 780, unit: 'm', reorder: 400, days: 6 },
  { material: 'MAT-BRG-BEAR', site: 'SITE-CRB', qty: 8, unit: 'pcs', reorder: 10, days: 7 },
  { material: 'MAT-GLAZE-UNIT', site: 'SITE-RIV', qty: 42, unit: 'pcs', reorder: 50, days: 8 },
  { material: 'MAT-DUCT-GI', site: 'SITE-MER', qty: 540, unit: 'm', reorder: 260, days: 9 },
]

export const DEMO_STOCK_SNAPSHOTS: StockSnapshot[] = SEEDS.map((seed, index) => ({
  id: `stock-${index + 1}`,
  material_id: seed.material,
  site_id: seed.site,
  quantity_on_hand: seed.qty,
  unit: seed.unit,
  recorded_at: daysAgo(seed.days),
  reorder_point: seed.reorder,
  metadata: {},
}))

const FORECAST_SEEDS: { material: string; site: string; predicted: number; low: number; high: number; status: string }[] = [
  { material: 'MAT-CONC-40', site: 'SITE-RIV', predicted: 1850, low: 1720, high: 1980, status: 'approved' },
  { material: 'MAT-STEEL-IPE', site: 'SITE-NGL', predicted: 320, low: 280, high: 365, status: 'generated' },
  { material: 'MAT-GYPSUM-15', site: 'SITE-MER', predicted: 2400, low: 2210, high: 2600, status: 'generated' },
  { material: 'MAT-HDPE-630', site: 'SITE-HBR', predicted: 640, low: 580, high: 710, status: 'approved' },
  { material: 'MAT-PILE-H300', site: 'SITE-ATL', predicted: 410, low: 360, high: 455, status: 'draft' },
  { material: 'MAT-INV-2MW', site: 'SITE-ATL', predicted: 6, low: 5, high: 7, status: 'generated' },
  { material: 'MAT-CABLE-PT', site: 'SITE-CRB', predicted: 1150, low: 980, high: 1320, status: 'approved' },
  { material: 'MAT-BRG-BEAR', site: 'SITE-CRB', predicted: 18, low: 16, high: 21, status: 'generated' },
]

export const DEMO_DEMAND_FORECASTS: DemandForecast[] = FORECAST_SEEDS.map((seed, index) => ({
  id: `df-${index + 1}`,
  material_id: seed.material,
  site_id: seed.site,
  forecast_type: 'material_demand',
  status: seed.status,
  predicted_quantity: seed.predicted,
  confidence_low: seed.low,
  confidence_high: seed.high,
  horizon_days: 30,
  model_version: 'v1.9.2',
  created_at: daysAgo(index + 1),
  created_by: 'usr-admin',
  approved_by: seed.status === 'approved' ? 'usr-admin' : null,
  notes: null,
}))

export const DEMO_STOCK_SNAPSHOT_LIST: StockSnapshotList = {
  snapshots: DEMO_STOCK_SNAPSHOTS,
  total: DEMO_STOCK_SNAPSHOTS.length,
  skip: 0,
  limit: 100,
}

export const DEMO_DEMAND_FORECAST_LIST: DemandForecastList = {
  forecasts: DEMO_DEMAND_FORECASTS,
  total: DEMO_DEMAND_FORECASTS.length,
  skip: 0,
  limit: 100,
}

export const DEMO_STOCKOUT_CHECK: StockoutCheck = {
  at_risk: true,
  days_of_cover: 9.4,
  reorder_quantity: '1240',
  recommendation_id: 'rec-7781',
}

/** Weekly stock on hand vs reorder point (thousands of units). */
export const DEMO_STOCK_TREND = [
  { week: 'W31', concrete: 3.4, steel: 2.1, gypsum: 1.8, reorder: 1.2 },
  { week: 'W32', concrete: 3.1, steel: 1.9, gypsum: 1.6, reorder: 1.2 },
  { week: 'W33', concrete: 2.9, steel: 1.7, gypsum: 1.5, reorder: 1.2 },
  { week: 'W34', concrete: 2.6, steel: 1.8, gypsum: 1.4, reorder: 1.2 },
  { week: 'W35', concrete: 2.4, steel: 1.5, gypsum: 1.1, reorder: 1.2 },
  { week: 'W36', concrete: 2.8, steel: 1.4, gypsum: 0.9, reorder: 1.2 },
  { week: 'W37', concrete: 2.5, steel: 1.3, gypsum: 0.8, reorder: 1.2 },
  { week: 'W38', concrete: 2.2, steel: 1.2, gypsum: 0.7, reorder: 1.2 },
]
