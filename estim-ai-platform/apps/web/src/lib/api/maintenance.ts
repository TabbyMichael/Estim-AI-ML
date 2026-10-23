'use client'

/**
 * Maintenance: /maintenance/equipment, /equipment/{id}/health.
 * `health_score` is not part of the API — derive it from the health report
 * (`needs_maintenance`, `latest_risk`, `critical`) instead.
 */

import { http, type PageParams, type Paginated } from './client'

export type EquipmentStatus = 'operational' | 'maintenance' | 'offline' | 'retired' | string

export type MaintenanceRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type Equipment = {
  id: string
  name: string
  equipment_type: string
  site_id: string
  status: EquipmentStatus
  operating_hours: number
  created_at: string
}

export type EquipmentHealth = {
  equipment_id: string
  status: string
  operating_hours: number
  needs_maintenance: boolean
  mtbf_hours: number
  latest_risk: MaintenanceRiskLevel | null
  critical: boolean
}

export type MaintenancePrediction = {
  id: string
  equipment_id: string
  failure_probability: number
  risk_level: MaintenanceRiskLevel
  horizon_days: number
  model_version: string
  created_at: string
  notes?: string | null
}

export type EquipmentList = Paginated<Equipment, 'equipment'>

export const maintenanceApi = {
  listEquipment: (params: PageParams & { site_id?: string; status?: string }) =>
    http.get<EquipmentList>('/maintenance/equipment', { params }),

  registerEquipment: (payload: {
    name: string
    equipment_type: string
    site_id?: string
  }) => http.post<Equipment>('/maintenance/equipment', payload),

  getEquipment: (equipmentId: string) =>
    http.get<Equipment>(`/maintenance/equipment/${equipmentId}`),

  logMaintenance: (
    equipmentId: string,
    payload: {
      maintenance_type: string
      description?: string
      performed_by?: string
      downtime_hours?: number
      cost?: number
    },
  ) => http.post<Record<string, unknown>>(`/maintenance/equipment/${equipmentId}/logs`, payload),

  recordPrediction: (
    equipmentId: string,
    payload: { failure_probability: number; horizon_days?: number },
  ) => http.post<MaintenancePrediction>(`/maintenance/equipment/${equipmentId}/predictions`, payload),

  healthReport: (equipmentId: string) =>
    http.get<EquipmentHealth>(`/maintenance/equipment/${equipmentId}/health`),
}
