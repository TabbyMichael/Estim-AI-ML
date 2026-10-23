/** Identity fixtures: users, roles, permissions and the offline demo session. */

import type { Permission, Role, User } from '../api/auth'
import { daysAgo } from './seed'

export const DEMO_USER: User = {
  id: 'usr-admin',
  email: 'alex.morgan@estim.ai',
  full_name: 'Alex Morgan',
  is_active: true,
  roles: ['admin', 'project_manager'],
  created_at: daysAgo(420),
  last_login_at: daysAgo(0),
}

/** Synthetic user used when the API is unreachable (demo session). */
export const DEMO_SESSION_USER: User = {
  id: 'usr-demo',
  email: 'demo@estim.ai',
  full_name: 'Demo Operator',
  is_active: true,
  roles: ['admin'],
  created_at: daysAgo(1),
  last_login_at: daysAgo(0),
}

export const DEMO_USERS: User[] = [
  DEMO_USER,
  {
    id: 'usr-pm',
    email: 'marcus.lee@estim.ai',
    full_name: 'Marcus Lee',
    is_active: true,
    roles: ['project_manager'],
    created_at: daysAgo(310),
    last_login_at: daysAgo(1),
  },
  {
    id: 'usr-proc',
    email: 'priya.raman@estim.ai',
    full_name: 'Priya Raman',
    is_active: true,
    roles: ['procurement_analyst'],
    created_at: daysAgo(280),
    last_login_at: daysAgo(2),
  },
  {
    id: 'usr-maint',
    email: 'elena.vasquez@estim.ai',
    full_name: 'Elena Vasquez',
    is_active: true,
    roles: ['maintenance_manager'],
    created_at: daysAgo(240),
    last_login_at: daysAgo(3),
  },
  {
    id: 'usr-view',
    email: 'tom.ferreira@estim.ai',
    full_name: 'Tomás Ferreira',
    is_active: false,
    roles: ['viewer'],
    created_at: daysAgo(180),
    last_login_at: daysAgo(64),
  },
  {
    id: 'usr-audit',
    email: 'aisha.bello@estim.ai',
    full_name: 'Aisha Bello',
    is_active: true,
    roles: ['viewer'],
    created_at: daysAgo(96),
    last_login_at: daysAgo(5),
  },
]

export const DEMO_ROLES: Role[] = [
  {
    name: 'admin',
    description: 'Full platform administration, including user and role management.',
    permissions: [
      'users:read',
      'users:write',
      'projects:read',
      'projects:write',
      'procurement:read',
      'procurement:write',
      'maintenance:read',
      'maintenance:write',
      'audit:read',
      'audit:purge',
    ],
  },
  {
    name: 'project_manager',
    description: 'Owns project delivery, forecasts and risk reviews.',
    permissions: [
      'projects:read',
      'projects:write',
      'procurement:read',
      'procurement:write',
      'maintenance:read',
    ],
  },
  {
    name: 'procurement_analyst',
    description: 'Reviews purchase orders and anomaly investigations.',
    permissions: ['procurement:read', 'procurement:write', 'projects:read'],
  },
  {
    name: 'maintenance_manager',
    description: 'Manages equipment health and maintenance windows.',
    permissions: ['maintenance:read', 'maintenance:write', 'projects:read'],
  },
  {
    name: 'viewer',
    description: 'Read-only access to dashboards and reports.',
    permissions: ['projects:read', 'procurement:read', 'maintenance:read'],
  },
]

export const DEMO_PERMISSIONS: Permission[] = [
  { code: 'users:read', description: 'View platform users' },
  { code: 'users:write', description: 'Create, update and deactivate users' },
  { code: 'projects:read', description: 'View projects, milestones and risk' },
  { code: 'projects:write', description: 'Edit projects and milestones' },
  { code: 'procurement:read', description: 'View purchase orders and anomalies' },
  { code: 'procurement:write', description: 'Create orders and review anomalies' },
  { code: 'maintenance:read', description: 'View equipment and health reports' },
  { code: 'maintenance:write', description: 'Register equipment and log maintenance' },
  { code: 'audit:read', description: 'View audit logs and summaries' },
  { code: 'audit:purge', description: 'Purge expired audit entries' },
]
