'use client'

/**
 * Project risk: /project-risk/projects/{id}/milestones|health|predictions.
 * There is no project catalogue endpoint — the UI uses the shared project
 * fixtures (see `src/lib/demo/projects.ts`).
 */

import { http, type PageParams } from './client'

export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | string

export type ProjectRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type Milestone = {
  id: string
  project_id: string
  name: string
  planned_start: string
  planned_end: string
  status: MilestoneStatus
  progress_pct: number
}

export type ProjectHealth = {
  project_id: string
  health: ProjectRiskLevel
  overdue_count: number
  milestone_count: number
  prediction_count: number
}

export type RiskPrediction = {
  id: string
  project_id: string
  milestone_id: string
  delay_probability: number
  predicted_delay_days: number
  risk_level: ProjectRiskLevel
  model_version: string
  created_at: string
  notes?: string | null
}

export const riskApi = {
  listMilestones: (projectId: string) =>
    http.get<Milestone[]>(`/project-risk/projects/${projectId}/milestones`),

  trackMilestone: (payload: {
    project_id: string
    name: string
    planned_start: string
    planned_end: string
    status?: MilestoneStatus
  }) => http.post<Milestone>('/project-risk/milestones', payload),

  projectHealth: (projectId: string) =>
    http.get<ProjectHealth>(`/project-risk/projects/${projectId}/health`),

  listPredictions: (projectId: string, params?: PageParams) =>
    http.get<{ predictions: RiskPrediction[]; total: number }>(
      `/project-risk/projects/${projectId}/predictions`,
      { params },
    ),

  recordPrediction: (
    projectId: string,
    payload: { milestone_id: string; delay_probability: number; predicted_delay_days: number },
  ) => http.post<RiskPrediction>(`/project-risk/projects/${projectId}/predictions`, payload),
}
