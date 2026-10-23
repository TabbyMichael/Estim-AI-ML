'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ArrowRight, Eye, EyeOff, Info, Loader2, Lock, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { InputWithIcon } from '@/components/ui/input'
import { ApiError, useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

/** Only allow same-origin, absolute-path redirects from the `next` param. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Incorrect email or password. Please try again.'
    if (error.status === 429) return 'Too many attempts. Wait a moment and try again.'
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'We could not sign you in. Please try again.'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { success } = useToast()

  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const nextPath = useMemo(() => safeNext(searchParams.get('next')), [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await login(values.email, values.password)
      success('Signed in', 'Welcome back to the Estim workspace.')
      router.replace(nextPath)
    } catch (error) {
      setFormError(describeError(error))
    }
  }

  return (
    <div className="w-full">
      <header className="mb-7">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary">Sign in</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Access forecasting, procurement and risk intelligence in one workspace.
        </p>
      </header>

      {formError ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">{formError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <InputWithIcon
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            className="h-10"
            icon={<Mail />}
            aria-invalid={errors.email ? true : undefined}
            disabled={isSubmitting}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <InputWithIcon
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="h-10"
            icon={<Lock />}
            aria-invalid={errors.password ? true : undefined}
            disabled={isSubmitting}
            trailing={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            }
            {...register('password')}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          {!isSubmitting ? <ArrowRight /> : null}
        </Button>
      </form>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
        <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden="true" />
        <p className="text-2xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground/80">No API?</span> If the backend is unreachable,
          any credentials open a fully populated demo workspace.
        </p>
      </div>

      <p className="mt-7 text-center text-xs text-muted-foreground">
        New to Estim?{' '}
        <Link
          href="/register"
          className={cn(
            'font-medium text-primary underline-offset-4 hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="w-full animate-pulse" aria-hidden="true">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-3 h-7 w-48 rounded bg-muted" />
      <div className="mt-2 h-3 w-full max-w-xs rounded bg-muted" />
      <div className="mt-8 space-y-4">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-11 rounded-lg bg-muted" />
      </div>
      <span className="sr-only">
        <Loader2 className="animate-spin" /> Loading sign-in form
      </span>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
