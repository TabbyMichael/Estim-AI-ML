'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import type { QueryClient } from '@tanstack/react-query'
import type { Permission, Role, User, UserListResponse } from '@/lib/api/auth'
import { adminApi } from '@/lib/api/admin'
import { useAuth } from '@/lib/auth-context'
import { DEMO_PERMISSIONS, DEMO_ROLES, DEMO_USERS } from '@/lib/demo/people'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import { isAdmin as hasAdminRole } from '@/config/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, InputWithIcon } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { Switch } from '@/components/ui/switch'
import { cn, formatNumber, formatRelative, humanize } from '@/lib/utils'

const USERS_KEY = queryKeys.admin.users({ scope: 'page' })
const ROLES_KEY = queryKeys.admin.roles()
const PERMISSIONS_KEY = queryKeys.admin.permissions()

const createSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Use at least 8 characters'),
  roles: z.array(z.string()).min(1, 'Assign at least one role'),
})

const editSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  roles: z.array(z.string()).min(1, 'Assign at least one role'),
  is_active: z.boolean(),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>
type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Deactivated' },
]

function roleTone(role: string): 'primary' | 'info' | 'warning' | 'success' | 'neutral' {
  switch (role.toLowerCase()) {
    case 'admin':
    case 'platform_admin':
      return 'primary'
    case 'project_manager':
      return 'info'
    case 'procurement_analyst':
      return 'warning'
    case 'maintenance_manager':
      return 'success'
    default:
      return 'neutral'
  }
}

function initials(user: User): string {
  const source = user.full_name || user.email
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const { success, error: toastError } = useToast()
  const admin = hasAdminRole(currentUser?.roles)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const demoUserList = useMemo<UserListResponse>(
    () => ({
      users: DEMO_USERS,
      total: DEMO_USERS.length,
      skip: 0,
      limit: 100,
    }),
    [],
  )

  const usersQuery = useDemoQuery<UserListResponse>({
    queryKey: USERS_KEY,
    queryFn: () => adminApi.listUsers({ limit: 100 }),
    demo: demoUserList,
    enabled: admin,
  })
  const rolesQuery = useDemoQuery<Role[]>({
    queryKey: ROLES_KEY,
    queryFn: adminApi.listRoles,
    demo: DEMO_ROLES,
    enabled: admin,
  })
  const permissionsQuery = useDemoQuery<Permission[]>({
    queryKey: PERMISSIONS_KEY,
    queryFn: adminApi.listPermissions,
    demo: DEMO_PERMISSIONS,
    enabled: admin,
  })

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', full_name: '', password: '', roles: ['viewer'] },
  })
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: '', roles: [], is_active: true },
  })

  const users = useMemo(() => usersQuery.data?.users ?? [], [usersQuery.data])
  const roles = rolesQuery.data ?? DEMO_ROLES
  const permissions = permissionsQuery.data ?? DEMO_PERMISSIONS

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((user) => {
      if (statusFilter === 'active' && !user.is_active) return false
      if (statusFilter === 'inactive' && user.is_active) return false
      if (!term) return true
      return `${user.full_name} ${user.email} ${user.roles.join(' ')}`
        .toLowerCase()
        .includes(term)
    })
  }, [users, search, statusFilter])

  const visibleIds = filtered.map((user) => user.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((current) => {
      const next = new Set(current)
      if (allSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  const patchUsers = (client: QueryClient, updater: (users: User[]) => User[]) => {
    client.setQueryData<UserListResponse>(USERS_KEY, (current) => {
      if (!current) return current
      const next = updater(current.users)
      return { ...current, users: next, total: next.length }
    })
  }

  const createMutation = useDemoMutation<User, CreateValues>({
    mutationFn: (values) =>
      adminApi.createUser({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        roles: values.roles,
      }),
    demo: (values, client) => {
      const created: User = {
        id: `usr-local-${Date.now()}`,
        email: values.email,
        full_name: values.full_name,
        is_active: true,
        roles: values.roles,
        created_at: new Date().toISOString(),
        last_login_at: null,
      }
      patchUsers(client, (current) => [created, ...current])
      return created
    },
    onSuccess: (created) => {
      success('User created', `${created.full_name} can now sign in.`)
      setCreateOpen(false)
      createForm.reset({ email: '', full_name: '', password: '', roles: ['viewer'] })
    },
    onError: (mutationError) => {
      toastError('Could not create user', mutationError.message)
    },
  })

  const updateMutation = useDemoMutation<User, { id: string; values: EditValues }>({
    mutationFn: ({ id, values }) =>
      adminApi.updateUser(id, {
        full_name: values.full_name,
        roles: values.roles,
        is_active: values.is_active,
      }),
    demo: ({ id, values }, client) => {
      const current = client.getQueryData<UserListResponse>(USERS_KEY)
      const existing = current?.users.find((user) => user.id === id)
      const updated: User = existing
        ? { ...existing, ...values }
        : {
            id,
            email: 'unknown@estim.ai',
            full_name: values.full_name,
            is_active: values.is_active,
            roles: values.roles,
            created_at: new Date().toISOString(),
            last_login_at: null,
          }
      patchUsers(client, (list) => list.map((user) => (user.id === id ? updated : user)))
      return updated
    },
    onSuccess: (updated) => {
      success('User updated', `${updated.full_name}'s profile was saved.`)
      setEditing(null)
    },
    onError: (mutationError) => {
      toastError('Could not update user', mutationError.message)
    },
  })

  const activeMutation = useDemoMutation<User, { user: User; active: boolean }>({
    mutationFn: ({ user, active }) =>
      active ? adminApi.reactivateUser(user.id) : adminApi.deactivateUser(user.id),
    demo: ({ user, active }, client) => {
      const updated: User = { ...user, is_active: active }
      patchUsers(client, (list) => list.map((candidate) => (candidate.id === user.id ? updated : candidate)))
      return updated
    },
    onSuccess: (updated, variables) => {
      success(
        variables.active ? 'User activated' : 'User deactivated',
        `${updated.full_name} is now ${variables.active ? 'active' : 'inactive'}.`,
      )
    },
    onError: (mutationError) => {
      toastError('Could not change user status', mutationError.message)
    },
  })

  const bulkMutation = useDemoMutation<User[], { ids: string[]; active: boolean }>({
    mutationFn: ({ ids, active }) =>
      active ? adminApi.bulkActivate(ids) : adminApi.bulkDeactivate(ids),
    demo: ({ ids, active }, client) => {
      const current = client.getQueryData<UserListResponse>(USERS_KEY)
      const updated = (current?.users ?? [])
        .filter((user) => ids.includes(user.id))
        .map((user) => ({ ...user, is_active: active }))
      patchUsers(client, (list) =>
        list.map((user) => (ids.includes(user.id) ? { ...user, is_active: active } : user)),
      )
      return updated
    },
    onSuccess: (_updated, variables) => {
      success(
        `${variables.ids.length} users ${variables.active ? 'activated' : 'deactivated'}`,
        'Bulk status change applied.',
      )
      setSelected(new Set())
    },
    onError: (mutationError) => {
      toastError('Bulk action failed', mutationError.message)
    },
  })

  const openEdit = (user: User) => {
    setEditing(user)
    editForm.reset({
      full_name: user.full_name,
      roles: user.roles,
      is_active: user.is_active,
    })
  }

  const columns = useMemo<Column<User>[]>(
    () => [
      {
        id: 'select',
        header: (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Select all visible users"
            className="h-3.5 w-3.5 rounded border-input accent-primary"
          />
        ),
        cell: (user) => (
          <input
            type="checkbox"
            checked={selected.has(user.id)}
            onChange={() => toggleOne(user.id)}
            aria-label={`Select ${user.full_name || user.email}`}
            className="h-3.5 w-3.5 rounded border-input accent-primary"
          />
        ),
        className: 'w-10',
      },
      {
        id: 'user',
        header: 'User',
        sortValue: (user) => user.full_name || user.email,
        cell: (user) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-2xs font-semibold text-muted-foreground">
              {initials(user)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{user.full_name || '—'}</p>
              <p className="truncate font-mono text-2xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'roles',
        header: 'Roles',
        cell: (user) =>
          user.roles.length === 0 ? (
            <span className="text-2xs text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role} tone={roleTone(role)} size="sm">
                  {humanize(role)}
                </Badge>
              ))}
            </div>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        sortValue: (user) => (user.is_active ? 1 : 0),
        cell: (user) => (
          <Badge tone={user.is_active ? 'success' : 'neutral'} dot>
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'last-login',
        header: 'Last login',
        sortValue: (user) => (user.last_login_at ? new Date(user.last_login_at).getTime() : 0),
        hideOnMobile: true,
        cell: (user) => (
          <span className="text-2xs text-muted-foreground">
            {user.last_login_at ? formatRelative(user.last_login_at) : 'Never'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        cell: (user) => {
          const isSelf = user.id === currentUser?.id
          return (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => activeMutation.mutate({ user, active: !user.is_active })}
                disabled={activeMutation.isPending || isSelf}
                title={isSelf ? 'You cannot change your own status' : undefined}
                className={user.is_active ? 'text-muted-foreground hover:text-destructive' : undefined}
              >
                {user.is_active ? (
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {user.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, filtered, allSelected, currentUser?.id, activeMutation.isPending],
  )

  if (!admin) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="User management"
          description="Accounts, roles and permissions across the workspace."
        />
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={ShieldX}
              title="Access denied"
              description="User management requires the admin role. Ask a workspace administrator to grant you access."
              action={
                <Button asChild variant="outline">
                  <Link href="/">Back to dashboard</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeCount = users.filter((user) => user.is_active).length
  const adminCount = users.filter((user) =>
    user.roles.some((role) => role.toLowerCase() === 'admin'),
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Search accounts, change activation state in bulk, assign roles and review the permission matrix."
        demo={usersQuery.isDemo || rolesQuery.isDemo || permissionsQuery.isDemo}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New user
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={formatNumber(users.length)}
          hint="Accounts in the workspace"
          icon={Users}
          loading={usersQuery.isLoading}
        />
        <StatCard
          label="Active"
          value={formatNumber(activeCount)}
          hint={`${users.length - activeCount} deactivated`}
          icon={CheckCircle2}
          tone="success"
          loading={usersQuery.isLoading}
        />
        <StatCard
          label="Administrators"
          value={formatNumber(adminCount)}
          hint="Users holding the admin role"
          icon={ShieldCheck}
          tone={adminCount > 0 ? 'primary' : 'warning'}
          loading={usersQuery.isLoading}
        />
        <StatCard
          label="Roles defined"
          value={formatNumber(roles.length)}
          hint={`${permissions.length} permissions available`}
          icon={ShieldCheck}
          tone="info"
          loading={rolesQuery.isLoading}
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(user) => user.id}
        loading={usersQuery.isLoading}
        error={usersQuery.error?.message ?? null}
        onRetry={() => usersQuery.refetch()}
        pageSize={10}
        caption="Workspace users"
        emptyTitle="No users match the filters"
        emptyDescription="Try a different search term or status filter."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <InputWithIcon
              icon={<Search />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or role"
              aria-label="Search users"
              className="w-full sm:w-72"
            />
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filter by status"
              className="w-full sm:w-40"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <span className="text-2xs text-muted-foreground">
                  {selected.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkMutation.mutate({ ids: Array.from(selected), active: true })
                  }
                  disabled={bulkMutation.isPending}
                >
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkMutation.mutate({ ids: Array.from(selected), active: false })
                  }
                  disabled={bulkMutation.isPending}
                >
                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                  Deactivate
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelected(new Set())}
                  aria-label="Clear selection"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <span className="text-2xs text-muted-foreground sm:ml-auto">
                {filtered.length} of {users.length} shown
              </span>
            )}
          </div>
        }
      />

      <Card>
        <CardToolbar
          title="Roles & permissions"
          description={`${roles.length} roles mapped to ${permissions.length} permissions.`}
        />
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            {roles.map((role) => (
              <div
                key={role.name}
                className="rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={roleTone(role.name)}>{humanize(role.name)}</Badge>
                  <span className="tabular text-2xs text-muted-foreground">
                    {role.permissions.length} permissions
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} tone="outline" size="sm" className="font-mono">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        description="Provision an account and assign its initial role set."
        closeOnOverlayClick={!createMutation.isPending}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-user-form" loading={createMutation.isPending}>
              Create user
            </Button>
          </>
        }
      >
        <form
          id="create-user-form"
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
          className="space-y-4"
          noValidate
        >
          <Field
            label="Email"
            htmlFor="create-email"
            required
            error={createForm.formState.errors.email?.message}
          >
            <Input
              id="create-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(createForm.formState.errors.email)}
              {...createForm.register('email')}
            />
          </Field>
          <Field
            label="Full name"
            htmlFor="create-name"
            required
            error={createForm.formState.errors.full_name?.message}
          >
            <Input
              id="create-name"
              autoComplete="name"
              aria-invalid={Boolean(createForm.formState.errors.full_name)}
              {...createForm.register('full_name')}
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="create-password"
            required
            hint="At least 8 characters. Share it through a secure channel."
            error={createForm.formState.errors.password?.message}
          >
            <Input
              id="create-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(createForm.formState.errors.password)}
              {...createForm.register('password')}
            />
          </Field>
          <Field
            label="Roles"
            required
            error={createForm.formState.errors.roles?.message}
          >
            <Controller
              control={createForm.control}
              name="roles"
              render={({ field }) => (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {roles.map((role) => {
                    const checked = field.value.includes(role.name)
                    return (
                      <label
                        key={role.name}
                        className={cn(
                          'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs transition-colors',
                          checked
                            ? 'border-primary/40 bg-primary-muted/40'
                            : 'border-border bg-surface hover:border-border/80',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? field.value.filter((value) => value !== role.name)
                                : [...field.value, role.name],
                            )
                          }
                          className="mt-0.5 h-3.5 w-3.5 rounded border-input accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">
                            {humanize(role.name)}
                          </span>
                          <span className="block text-2xs text-muted-foreground">
                            {role.description}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.full_name || editing.email}` : 'Edit user'}
        description="Update the display name, roles and account status."
        closeOnOverlayClick={!updateMutation.isPending}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setEditing(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" loading={updateMutation.isPending}>
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="edit-user-form"
          onSubmit={editForm.handleSubmit((values) => {
            if (!editing) return
            updateMutation.mutate({ id: editing.id, values })
          })}
          className="space-y-4"
          noValidate
        >
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <p className="font-mono text-foreground">{editing?.email}</p>
            <p className="mt-1 text-2xs text-muted-foreground">
              Account created {editing ? formatRelative(editing.created_at) : '—'}
            </p>
          </div>
          <Field
            label="Full name"
            htmlFor="edit-name"
            required
            error={editForm.formState.errors.full_name?.message}
          >
            <Input
              id="edit-name"
              autoComplete="name"
              aria-invalid={Boolean(editForm.formState.errors.full_name)}
              {...editForm.register('full_name')}
            />
          </Field>
          <Field label="Roles" required error={editForm.formState.errors.roles?.message}>
            <Controller
              control={editForm.control}
              name="roles"
              render={({ field }) => (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {roles.map((role) => {
                    const checked = field.value.includes(role.name)
                    return (
                      <label
                        key={role.name}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition-colors',
                          checked
                            ? 'border-primary/40 bg-primary-muted/40'
                            : 'border-border bg-surface hover:border-border/80',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? field.value.filter((value) => value !== role.name)
                                : [...field.value, role.name],
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-input accent-primary"
                        />
                        <span className="font-medium text-foreground">{humanize(role.name)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            />
          </Field>
          <Controller
            control={editForm.control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Account active</p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    Deactivated users cannot sign in.
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Account active"
                />
              </div>
            )}
          />
        </form>
      </Modal>
    </div>
  )
}
