'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { InputWithIcon } from '@/components/ui/input'
import { ApiError, useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Enter your full name')
      .max(120, 'That name is too long'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterValues = z.infer<typeof registerSchema>

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'An account with this email already exists.'
    if (error.status === 422) return error.message
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return 'We could not create your account. Please try again.'
}

const STRENGTH_STEPS = [
  { label: 'Too short', className: 'bg-destructive' },
  { label: 'Weak', className: 'bg-destructive' },
  { label: 'Fair', className: 'bg-warning' },
  { label: 'Good', className: 'bg-info' },
  { label: 'Strong', className: 'bg-success' },
] as const

/** 0–4 heuristic score; purely advisory, the schema enforces the minimum. */
function passwordScore(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
}

export default function RegisterPage() {
  const router = useRouter()
  const { register: signUp } = useAuth()
  const { success } = useToast()

  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  })

  const password = watch('password')
  const score = passwordScore(password)
  const strength = STRENGTH_STEPS[score]

  async function onSubmit(values: RegisterValues) {
    setFormError(null)
    try {
      await signUp(values.email, values.password, values.fullName)
      success('Account created', 'Your Estim workspace is ready.')
      router.replace('/')
    } catch (error) {
      setFormError(describeError(error))
    }
  }

  return (
    <div className="w-full">
      <header className="mb-7">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary">Get started</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Start forecasting costs, de-risking projects and catching anomalies early.
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
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
          <InputWithIcon
            id="fullName"
            type="text"
            placeholder="Ada Lovelace"
            autoComplete="name"
            autoFocus
            className="h-10"
            icon={<User />}
            aria-invalid={errors.fullName ? true : undefined}
            disabled={isSubmitting}
            {...register('fullName')}
          />
        </Field>

        <Field label="Work email" htmlFor="email" error={errors.email?.message} required>
          <InputWithIcon
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            className="h-10"
            icon={<Mail />}
            aria-invalid={errors.email ? true : undefined}
            disabled={isSubmitting}
            {...register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint={password ? undefined : 'At least 8 characters.'}
          required
        >
          <InputWithIcon
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            autoComplete="new-password"
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
          {password ? (
            <div className="pt-1" aria-live="polite">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      index < Math.max(score, 1) ? strength.className : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-2xs text-muted-foreground">
                Password strength: <span className="font-medium text-foreground/80">{strength.label}</span>
              </p>
            </div>
          ) : null}
        </Field>

        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <InputWithIcon
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            className="h-10"
            icon={<Lock />}
            aria-invalid={errors.confirmPassword ? true : undefined}
            disabled={isSubmitting}
            trailing={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowConfirm((current) => !current)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                aria-pressed={showConfirm}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff /> : <Eye />}
              </Button>
            }
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
          {!isSubmitting ? <ArrowRight /> : null}
        </Button>
      </form>

      <p className="mt-4 text-2xs leading-relaxed text-muted-foreground">
        By creating an account you agree to use Estim in line with your organisation&apos;s acceptable use
        policy. If the API is offline, sign-up opens a demo workspace instead.
      </p>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className={cn(
            'font-medium text-primary underline-offset-4 hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
