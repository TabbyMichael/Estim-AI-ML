'use client'

/**
 * Cost forecasting: /cost-forecasting/forecasts|snapshots|models.
 * Note: approve/reject/actual take query parameters on the backend.
 */

import { http, type PageParams, type Paginated } from './client'

export type ForecastType =
  | 'project_total'
  | 'phase_breakdown'
  | 'monthly_burn'
  | 'variance_analysis'

export type ForecastStatus = 'draft' | 'generated' | 'approved' | 'rejected' | 'superseded'

export type CostForecast = {
  id: string
  project_id: string
  forecast_type: ForecastType
  status: ForecastStatus
  predicted_amount: number
  confidence_interval_low: number
  confidence_interval_high: number
  model_version: string
  created_at: string
  created_by: string
  actual_amount?: number | null
  variance?: number | null
  accuracy_score?: number | null
  approved_by?: string | null
  approved_at?: string | null
  notes?: string | null
}

export type CostSnapshot = {
  id: string
  project_id: string
  category: string
  amount: number
  recorded_at: string
  currency: string
  metadata: Record<string, unknown>
}

export type ForecastModel = {
  id: string
  name: string
  version: string
  model_type: string
  training_period_start: string
  training_period_end: string
  is_active: boolean
  created_at: string
  metrics: Record<string, number>
}

export type CostForecastList = Paginated<CostForecast, 'forecasts'>
export type CostSnapshotList = Paginated<CostSnapshot, 'snapshots'>
export type ForecastModelList = Paginated<ForecastModel, 'models'>

export type CostForecastCreatePayload = {
  project_id: string
  forecast_type: ForecastType
  predicted_amount: number
  confidence_interval_low: number
  confidence_interval_high: number
  model_version: string
  created_by: string
}

export const forecastingApi = {
  listForecasts: (params: PageParams & {
    project_id?: string
    forecast_type?: ForecastType
    status?: ForecastStatus
  }) => http.get<CostForecastList>('/cost-forecasting/forecasts', { params }),

  createForecast: (payload: CostForecastCreatePayload) =>
    http.post<CostForecast>('/cost-forecasting/forecasts', payload),

  generateForecast: (forecastId: string) =>
    http.post<CostForecast>(`/cost-forecasting/forecasts/${forecastId}/generate`),

  approveForecast: (forecastId: string, approvedBy: string, notes?: string) =>
    http.post<CostForecast>(`/cost-forecasting/forecasts/${forecastId}/approve`, undefined, {
      params: { approved_by: approvedBy, notes },
    }),

  rejectForecast: (forecastId: string, rejectedBy: string, notes?: string) =>
    http.post<CostForecast>(`/cost-forecasting/forecasts/${forecastId}/reject`, undefined, {
      params: { rejected_by: rejectedBy, notes },
    }),

  recordActual: (forecastId: string, actualAmount: number) =>
    http.post<CostForecast>(`/cost-forecasting/forecasts/${forecastId}/actual`, undefined, {
      params: { actual_amount: actualAmount },
    }),

  listSnapshots: (params: PageParams & { project_id?: string; category?: string }) =>
    http.get<CostSnapshotList>('/cost-forecasting/snapshots', { params }),

  createSnapshot: (payload: {
    project_id: string
    category: string
    amount: number
    recorded_at?: string
    currency?: string
    metadata?: Record<string, unknown>
  }) => http.post<CostSnapshot>('/cost-forecasting/snapshots', payload),

  listModels: (params?: PageParams) =>
    http.get<ForecastModelList>('/cost-forecasting/models', { params }),

  activeModel: () => http.get<ForecastModel>('/cost-forecasting/models/active'),

  activateModel: (modelId: string) =>
    http.post<ForecastModel>(`/cost-forecasting/models/${modelId}/activate`),
}
