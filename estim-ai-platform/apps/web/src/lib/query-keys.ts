/**
 * Central TanStack Query key registry. Keeping keys here prevents cache
 * mismatches between pages and mutations.
 */

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    list: (params: Record<string, unknown>) => ['notifications', 'list', params] as const,
    stats: (userId: string | undefined) => ['notifications', 'stats', userId] as const,
    preferences: (userId: string | undefined) => ['notifications', 'preferences', userId] as const,
  },
  procurement: {
    all: () => ['procurement'] as const,
    orders: (params: Record<string, unknown>) => ['procurement', 'orders', params] as const,
    anomalies: (params: Record<string, unknown>) => ['procurement', 'anomalies', params] as const,
  },
  forecasting: {
    all: () => ['forecasting'] as const,
    forecasts: (params: Record<string, unknown>) => ['forecasting', 'forecasts', params] as const,
    snapshots: (params: Record<string, unknown>) => ['forecasting', 'snapshots', params] as const,
    models: () => ['forecasting', 'models'] as const,
    activeModel: () => ['forecasting', 'models', 'active'] as const,
  },
  inventory: {
    all: () => ['inventory'] as const,
    snapshots: (params: Record<string, unknown>) => ['inventory', 'snapshots', params] as const,
    forecasts: (params: Record<string, unknown>) => ['inventory', 'forecasts', params] as const,
    stockout: (params: Record<string, unknown>) => ['inventory', 'stockout', params] as const,
  },
  maintenance: {
    all: () => ['maintenance'] as const,
    equipment: (params: Record<string, unknown>) => ['maintenance', 'equipment', params] as const,
    health: (equipmentId: string) => ['maintenance', 'health', equipmentId] as const,
  },
  risk: {
    all: () => ['risk'] as const,
    milestones: (projectId: string) => ['risk', 'milestones', projectId] as const,
    health: (projectId: string) => ['risk', 'health', projectId] as const,
    predictions: (projectId: string) => ['risk', 'predictions', projectId] as const,
  },
  inspection: {
    all: () => ['inspection'] as const,
    list: (params: Record<string, unknown>) => ['inspection', 'list', params] as const,
    summary: (inspectionId: string) => ['inspection', 'summary', inspectionId] as const,
  },
  documents: {
    all: () => ['documents'] as const,
    list: (params: Record<string, unknown>) => ['documents', 'list', params] as const,
  },
  reports: {
    all: () => ['reports'] as const,
    list: (params: Record<string, unknown>) => ['reports', 'list', params] as const,
    schedules: () => ['reports', 'schedules'] as const,
  },
  audit: {
    all: () => ['audit'] as const,
    logs: (params: Record<string, unknown>) => ['audit', 'logs', params] as const,
    summary: () => ['audit', 'summary'] as const,
  },
  admin: {
    all: () => ['admin'] as const,
    users: (params: Record<string, unknown>) => ['admin', 'users', params] as const,
    roles: () => ['admin', 'roles'] as const,
    permissions: () => ['admin', 'permissions'] as const,
  },
}
