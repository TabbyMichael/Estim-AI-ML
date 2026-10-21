'use client'

export const dynamic = 'force-dynamic'

/**
 * Admin user management (Roadmap 1.1):
 * user list with search/filter, create/edit forms, role assignment,
 * activity log, bulk activate/deactivate and per-user activation.
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuth } from '@/lib/auth-context'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type User = {
  id: string
  email: string
  full_name: string
  is_active: boolean
  roles: string[]
  created_at: string
  last_login_at?: string | null
}

type UserList = { users: User[]; total: number }
type Role = { name: string; description: string; permissions: string[] }

export default function AdminUsersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = user?.roles?.some((r) => r === 'admin' || r === 'platform_admin')

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', roles: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', roles: '' })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    qc.invalidateQueries({ queryKey: ['admin-roles'] })
  }

  const { data, isLoading } = useQuery<UserList>({
    enabled: !!isAdmin,
    queryKey: ['admin-users', search, activeFilter],
    queryFn: async () => (
      await axios.get(`${API}/admin/users`, {
        params: {
          limit: 100,
          ...(search ? { q: search } : {}),
          ...(activeFilter ? { is_active: activeFilter === 'true' } : {}),
        },
      })
    ).data,
  })

  const { data: roles } = useQuery<Role[]>({
    enabled: !!isAdmin,
    queryKey: ['admin-roles'],
    queryFn: async () => (await axios.get(`${API}/admin/roles`)).data,
  })

  const createUser = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await axios.post(`${API}/admin/users`, body)).data,
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setForm({ email: '', password: '', full_name: '', roles: '' })
    },
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      (await axios.put(`${API}/admin/users/${id}`, body)).data,
    onSuccess: () => {
      invalidate()
      setEditId(null)
    },
  })

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (
        await axios.post(
          `${API}/admin/users/${id}/${active ? 'reactivate' : 'deactivate'}`,
        )
      ).data,
    onSuccess: invalidate,
  })

  const bulkSet = useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) =>
      (
        await axios.post(
          `${API}/admin/users/bulk-${active ? 'activate' : 'deactivate'}`,
          ids,
        )
      ).data,
    onSuccess: () => {
      invalidate()
      setSelected(new Set())
    },
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!isAdmin) {
    return (
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Access denied</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            User management requires the admin role.
          </p>
        </div>
      </div>
    )
  }

  const users = data?.users ?? []

  return (
    <>
      <div className="page-header">
        <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>User Management</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Administer accounts, roles and permissions
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New user
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Search + filters + bulk */}
        <div className="card animate-slide-up" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Search email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <select className="input" value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as '' | 'true' | 'false')}
            style={{ minWidth: 140 }}>
            <option value="">All users</option>
            <option value="true">Active only</option>
            <option value="false">Deactivated</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {selected.size} selected
            </span>
            <button className="btn btn-ghost" disabled={selected.size === 0 || bulkSet.isPending}
              onClick={() => bulkSet.mutate({ ids: [...selected], active: true })}>
              Activate
            </button>
            <button className="btn btn-ghost" disabled={selected.size === 0 || bulkSet.isPending}
              style={{ color: '#ef4444' }}
              onClick={() => bulkSet.mutate({ ids: [...selected], active: false })}>
              Deactivate
            </button>
          </div>
        </div>

        {/* Users table */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.1s', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: 600 }}>Users</h3>
            <span className="badge badge-brand">{data?.total ?? 0} total</span>
          </div>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <input type="checkbox" checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)} />
                      </td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{u.email}</td>
                      <td style={{ fontWeight: 500 }}>{u.full_name || '—'}</td>
                      <td>
                        {u.roles.length === 0 ? '—' : u.roles.map((r) => (
                          <span key={r} className="badge badge-brand" style={{ marginRight: 4, fontSize: '0.62rem' }}>{r}</span>
                        ))}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: u.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: u.is_active ? '#22c55e' : '#ef4444',
                        }}>
                          {u.is_active ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'never'}
                      </td>
                      <td style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem' }}
                          onClick={() => {
                            setEditId(u.id)
                            setEditForm({ full_name: u.full_name, roles: u.roles.join(', ') })
                          }}>
                          Edit
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem' }}
                          onClick={() => setActive.mutate({ id: u.id, active: !u.is_active })}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {users.length === 0 && !isLoading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No users found.
            </div>
          )}
        </div>

        {/* Roles overview (permission management) */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.15s', marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Roles &amp; permissions</h3>
          {!roles || roles.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No roles defined yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {roles.map((r) => (
                <div key={r.name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem', borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span className="badge badge-brand">{r.name}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>
                    {r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {r.permissions.slice(0, 6).join(', ')}
                    {r.permissions.length > 6 ? ' …' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowCreate(false)}>
            <div className="card" style={{ width: 420, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>New user</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <input className="input" placeholder="Email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="input" type="password" placeholder="Password (min 8)" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <input className="input" placeholder="Full name" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <input className="input" placeholder="Roles (comma separated, e.g. admin)" value={form.roles}
                  onChange={(e) => setForm({ ...form, roles: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={createUser.isPending}
                  onClick={() => createUser.mutate({
                    email: form.email, password: form.password, full_name: form.full_name,
                    roles: form.roles.split(',').map((s) => s.trim()).filter(Boolean),
                  })}>
                  {createUser.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editId && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setEditId(null)}>
            <div className="card" style={{ width: 420, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Edit user</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <input className="input" placeholder="Full name" value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                <input className="input" placeholder="Roles (comma separated)" value={editForm.roles}
                  onChange={(e) => setEditForm({ ...editForm, roles: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={updateUser.isPending}
                  onClick={() => updateUser.mutate({
                    id: editId,
                    body: {
                      full_name: editForm.full_name,
                      roles: editForm.roles.split(',').map((s) => s.trim()).filter(Boolean),
                    },
                  })}>
                  {updateUser.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}


