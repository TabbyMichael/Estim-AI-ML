'use client'

/**
 * Inventory: /inventory/snapshots|forecasts|stockout-check.
 * Note: stockout-check takes query parameters and returns a computed record.
 */

import { http, type PageParams, type Paginated } from './client'

export type StockSnapshot = {
  id: string
  material_id: string
  site_id: string
  quantity_on_hand: number
  unit: string
  recorded_at: string
  reorder_point: number
  metadata: Record<string, unknown>
}

export type DemandForecast = {
  id: string
  material_id: string
  site_id: string
  forecast_type: string
  status: string
  predicted_quantity: number
  confidence_low: number
  confidence_high: number
  horizon_days: number
  model_version: string
  created_at: string
  created_by: string
  approved_by?: string | null
  notes?: string | null
}

export type StockSnapshotList = Paginated<StockSnapshot, 'snapshots'>
export type DemandForecastList = Paginated<DemandForecast, 'forecasts'>

export type StockoutCheck = {
  at_risk: boolean
  days_of_cover?: number
  reorder_quantity?: string
  recommendation_id?: string
  reason?: string
}

export const inventoryApi = {
  listSnapshots: (params: PageParams & { material_id?: string; site_id?: string }) =>
    http.get<StockSnapshotList>('/inventory/snapshots', { params }),

  createSnapshot: (payload: {
    material_id: string
    site_id: string
    quantity_on_hand: number
    unit?: string
    recorded_at?: string
    reorder_point?: number
    metadata?: Record<string, unknown>
  }) => http.post<StockSnapshot>('/inventory/snapshots', payload),

  listForecasts: (params: PageParams & {
    material_id?: string
    site_id?: string
    status?: string
  }) => http.get<DemandForecastList>('/inventory/forecasts', { params }),

  createForecast: (payload: {
    material_id: string
    site_id: string
    forecast_type: string
    predicted_quantity: number
    confidence_low: number
    confidence_high: number
    horizon_days?: number
    model_version?: string
    created_by: string
  }) => http.post<DemandForecast>('/inventory/forecasts', payload),

  generateForecast: (forecastId: string) =>
    http.post<DemandForecast>(`/inventory/forecasts/${forecastId}/generate`),

  approveForecast: (forecastId: string, approvedBy: string, notes?: string) =>
    http.post<DemandForecast>(`/inventory/forecasts/${forecastId}/approve`, undefined, {
      params: { approved_by: approvedBy, notes },
    }),

  stockoutCheck: (params: {
    material_id: string
    site_id: string
    daily_demand: number
    horizon_days?: number
  }) => http.get<StockoutCheck>('/inventory/stockout-check', { params }),
}
