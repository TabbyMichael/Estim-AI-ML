'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Rows3,
  Rows4,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'
import { errorMessage, isDemoEligible } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useTheme, type Theme } from '@/lib/theme-provider'
import { useToast } from '@/lib/hooks/use-toast'
import { isAdmin as hasAdminRole } from '@/config/navigation'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/segmented-control'
import { Tabs, TabsPanel, type TabItem } from '@/components/ui/tabs'
import { cn, formatDate, formatDateTime, formatId, formatRelative, humanize } from '@/lib/utils'

type ProfileTab = 'account' | 'preferences' | 'security'
type Density = 'comfortable' | 'compact'
type RoleTone = 'primary' | 'info' | 'warning' | 'success' | 'neutral'

const DENSITY_KEY = 'estim_density'

const TABS: TabItem[] = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'security', label: 'Security', icon: ShieldCheck },
]

const THEME_OPTIONS: SegmentedOption<Theme>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const DENSITY_OPTIONS: SegmentedOption<Density>[] = [
  { value: 'comfortable', label: 'Comfortable', icon: Rows3 },
  { value: 'compact', label: 'Compact', icon: Rows4 },
]

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().min(8, 'Use at least 8 characters'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })
  .refine((values) => values.new_password !== values.current_password, {
    path: ['new_password'],
    message: 'Choose a password different from the current one',
  })

type PasswordValues = z.infer<typeof passwordSchema>

function roleTone(role: string): RoleTone {
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

function readDensity(): Density {
  if (typeof window === 'undefined') return 'comfortable'
  try {
    return window.localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export default function ProfilePage() {
  const { user, isDemoSession, changePassword, logout } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { success, error: toastError, info } = useToast()

  const [tab, setTab] = useState<ProfileTab>('account')
  const [density, setDensity] = useState<Density>('comfortable')
  const [showPasswords, setShowPasswords] = useState(false)
  const [timezone, setTimezone] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  // Read device preferences after mount so the server-rendered markup stays stable.
  useEffect(() => {
    setDensity(readDensity())
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
    } catch {
      setTimezone('')
    }
  }, [])

  const applyDensity = (next: Density) => {
    setDensity(next)
    document.documentElement.dataset.density = next
    try {
      window.localStorage.setItem(DENSITY_KEY, next)
    } catch {
      /* storage disabled */
    }
  }

  const handleSignOut = () => {
    logout()
    info('Signed out', 'Your session has been cleared on this device.')
  }

  const onChangePassword = handleSubmit(async (values) => {
    const finish = () => {
      reset()
      setShowPasswords(false)
    }

    if (isDemoSession) {
      info('Demo mode', 'Password changes are simulated in the demo session.')
      finish()
      return
    }

    try {
      await changePassword(values.current_password, values.new_password)
      success('Password updated', 'Use your new password the next time you sign in.')
      finish()
    } catch (error) {
      if (isDemoEligible(error)) {
        info('Demo mode', 'The API is unreachable, so your password was not changed.')
        finish()
        return
      }
      toastError(
        'Could not change password',
        errorMessage(error, 'Check your current password and try again.'),
      )
    }
  })

  const roles = user?.roles ?? []
  const admin = hasAdminRole(user?.roles)
  const passwordInputType = showPasswords ? 'text' : 'password'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Identity, appearance preferences and security controls for this workspace."
        actions={
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={user?.full_name} size="lg" className="h-14 w-14 text-lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight">
                  {user?.full_name ?? 'Account'}
                </h2>
                <Badge tone={isDemoSession ? 'warning' : 'success'} dot>
                  {isDemoSession ? 'Demo session' : 'Live session'}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{user?.email ?? '—'}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role} tone={roleTone(role)}>
                      {humanize(role)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-2xs text-muted-foreground">No roles assigned</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Joined {formatDate(user?.created_at)}
            </span>
          </div>
        </div>
      </Card>

      <Tabs items={TABS} value={tab} onValueChange={(id) => setTab(id as ProfileTab)} aria-label="Profile sections" />

      <TabsPanel id="account" active={tab} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardToolbar
            title="Account details"
            description="Identity and access attached to this session."
          />
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Full name
                </dt>
                <dd className="mt-1 truncate text-sm text-foreground">{user?.full_name ?? '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 truncate text-sm text-foreground">{user?.email ?? '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1">
                  <Badge tone={user?.is_active ? 'success' : 'neutral'} dot>
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Account ID
                </dt>
                <dd className="mt-1 font-mono text-xs text-foreground">{user?.id ?? '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Member since
                </dt>
                <dd className="mt-1 text-sm text-foreground">{formatDate(user?.created_at)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Last sign-in
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {user?.last_login_at ? formatDateTime(user.last_login_at) : '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardToolbar
              title="Session"
              description={
                isDemoSession
                  ? 'Offline demo operator backed by local fixtures.'
                  : 'Authenticated against the Estim API.'
              }
            />
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Session type</dt>
                  <dd>
                    <Badge tone={isDemoSession ? 'warning' : 'success'} dot>
                      {isDemoSession ? 'Demo' : 'Live'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">User reference</dt>
                  <dd className="font-mono text-xs">{formatId(user?.id)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Last sign-in</dt>
                  <dd className="text-xs">{formatRelative(user?.last_login_at)}</dd>
                </div>
              </dl>
              {isDemoSession ? (
                <p className="rounded-lg border border-warning/25 bg-warning-muted px-3 py-2 text-2xs leading-relaxed text-warning">
                  Demo data is generated locally. Changes are simulated and never leave this
                  device.
                </p>
              ) : null}
              <Button variant="outline" className="w-full justify-start" onClick={handleSignOut}>
                <LogOut />
                Sign out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardToolbar title="Shortcuts" description="Places tied to your account." />
            <CardContent className="space-y-1.5">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/notifications">
                  <Bell />
                  Notification settings
                </Link>
              </Button>
              {admin ? (
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/admin/users">
                    <ShieldCheck />
                    Roles &amp; permissions
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </TabsPanel>

      <TabsPanel id="preferences" active={tab} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardToolbar
            title="Appearance"
            description="Theme and interface density are stored on this device."
          />
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Resolved appearance: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}.
                </p>
              </div>
              <SegmentedControl
                options={THEME_OPTIONS}
                value={theme}
                onValueChange={setTheme}
                aria-label="Theme preference"
              />
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Density</p>
                <p className="text-xs text-muted-foreground">
                  Compact tightens spacing and type size across the workspace.
                </p>
              </div>
              <SegmentedControl
                options={DENSITY_OPTIONS}
                value={density}
                onValueChange={applyDensity}
                aria-label="Interface density"
              />
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Preview
              </p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">Northgate Tower — Foundation</span>
                  <Badge tone="success" dot>
                    On track
                  </Badge>
                </div>
                <Progress value={72} size="sm" tone="success" label="Sample progress" />
                <div className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                  <span>72% complete</span>
                  <span className="tabular">Updated 2 hours ago</span>
                </div>
              </div>
            </div>

            <p className="text-2xs leading-relaxed text-muted-foreground">
              Preferences are per browser. Clearing site data resets theme and density to the
              defaults.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardToolbar title="This device" description="Environment detected by the browser." />
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Theme</dt>
                <dd className="text-xs">{humanize(theme)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Density</dt>
                <dd className="text-xs">{humanize(density)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Time zone</dt>
                <dd className="truncate text-xs">{timezone || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Session</dt>
                <dd>
                  <Badge tone={isDemoSession ? 'warning' : 'success'} dot>
                    {isDemoSession ? 'Demo' : 'Live'}
                  </Badge>
                </dd>
              </div>
            </dl>
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
              <Laptop className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Appearance is applied before first paint by the boot script, so navigation never
              flashes the wrong theme.
            </p>
          </CardContent>
        </Card>
      </TabsPanel>

      <TabsPanel id="security" active={tab} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardToolbar
            title="Change password"
            description="Verify the current credential before setting a new one."
          />
          <CardContent>
            <form onSubmit={onChangePassword} className="space-y-4" noValidate>
              <Field
                label="Current password"
                htmlFor="current_password"
                error={errors.current_password?.message}
                required
              >
                <Input
                  id="current_password"
                  type={passwordInputType}
                  autoComplete="current-password"
                  aria-invalid={errors.current_password ? true : undefined}
                  {...register('current_password')}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="New password"
                  htmlFor="new_password"
                  error={errors.new_password?.message}
                  hint="At least 8 characters."
                  required
                >
                  <Input
                    id="new_password"
                    type={passwordInputType}
                    autoComplete="new-password"
                    aria-invalid={errors.new_password ? true : undefined}
                    {...register('new_password')}
                  />
                </Field>
                <Field
                  label="Confirm new password"
                  htmlFor="confirm_password"
                  error={errors.confirm_password?.message}
                  required
                >
                  <Input
                    id="confirm_password"
                    type={passwordInputType}
                    autoComplete="new-password"
                    aria-invalid={errors.confirm_password ? true : undefined}
                    {...register('confirm_password')}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(event) => setShowPasswords(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input accent-primary"
                  />
                  {showPasswords ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Show passwords
                </label>
                <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                  <KeyRound />
                  Update password
                </Button>
              </div>

              {isDemoSession ? (
                <p className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-muted px-3 py-2 text-2xs leading-relaxed text-warning">
                  <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Demo session: submissions are simulated and no credential is stored.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardToolbar
            title="Session security"
            description="Everything currently authorized on this device."
          />
          <CardContent className="space-y-4">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Last sign-in</dt>
                <dd className="text-xs">{formatRelative(user?.last_login_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="font-mono text-xs">{formatId(user?.id)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Mode</dt>
                <dd>
                  <Badge tone={isDemoSession ? 'warning' : 'success'} dot>
                    {isDemoSession ? 'Demo' : 'Live'}
                  </Badge>
                </dd>
              </div>
            </dl>

            <p
              className={cn(
                'rounded-lg border px-3 py-2 text-2xs leading-relaxed',
                isDemoSession
                  ? 'border-warning/25 bg-warning-muted text-warning'
                  : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {isDemoSession
                ? 'Signing out clears the demo flag; you can start a new demo session from the sign-in page.'
                : 'Signing out clears the stored access and refresh tokens on this device.'}
            </p>

            <Button variant="destructive" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </TabsPanel>
    </div>
  )
}
