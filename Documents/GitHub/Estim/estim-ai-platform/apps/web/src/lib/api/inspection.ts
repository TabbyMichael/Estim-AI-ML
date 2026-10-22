'use client'

/**
 * Visual inspection: /visual-inspection/inspections.
 * There is no `defect_count` on the inspection record — use the per-inspection
 * `reviewSummary()` (or detections) to surface defect counts.
 */

import { http, type PageParams, type Paginated } from './client'

export type Inspection = {
  id: string
  project_id: string
  site_id: string
  title: string
  status: string
  created_by: string
  created_at: string
}

export type InspectionImage = {
  id: string
  inspection_id: string
  storage_key: string
  filename: string
  content_type: string
  size_bytes: number
}

export type DefectDetection = {
  id: string
  image_id: string
  inspection_id: string
  defect_type: string
  confidence: number
  severity: string
}

export type InspectionSummary = {
  inspection_id: string
  status: string
  detection_count: number
  worst_severity: string
  needs_rework: boolean
}

export type InspectionList = Paginated<Inspection, 'inspections'>

export const inspectionApi = {
  listInspections: (params: PageParams & { project_id?: string }) =>
    http.get<InspectionList>('/visual-inspection/inspections', { params }),

  createInspection: (payload: {
    project_id: string
    title?: string
    site_id?: string
    created_by?: string
  }) => http.post<Inspection>('/visual-inspection/inspections', payload),

  attachImage: (
    inspectionId: string,
    payload: {
      storage_key: string
      filename?: string
      content_type?: string
      size_bytes?: number
    },
  ) => http.post<InspectionImage>(`/visual-inspection/inspections/${inspectionId}/images`, payload),

  recordDetection: (
    inspectionId: string,
    payload: { image_id: string; defect_type: string; confidence: number; bbox?: Record<string, number> },
  ) =>
    http.post<DefectDetection>(
      `/visual-inspection/inspections/${inspectionId}/detections`,
      payload,
    ),

  reviewSummary: (inspectionId: string) =>
    http.get<InspectionSummary>(`/visual-inspection/inspections/${inspectionId}/summary`),
}
