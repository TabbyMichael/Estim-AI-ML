import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type NumberInput = number | null | undefined

function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** `1234.5` → `1,234.5` (safe for null / NaN / undefined). */
export function formatNumber(value: NumberInput, maximumFractionDigits = 0): string {
  const n = toNumber(value)
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(n)
}

/** `1_250_000` → `1.3M`. Used for dense KPI and axis labels. */
export function formatCompact(value: NumberInput, maximumFractionDigits = 1): string {
  const n = toNumber(value)
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits,
  }).format(n)
}

type CurrencyOptions = {
  currency?: string
  compact?: boolean
  maximumFractionDigits?: number
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero'
}

/** `12345.67` → `$12,345.67`; with `{ compact: true }` → `$12.3K`. */
export function formatCurrency(value: NumberInput, options: CurrencyOptions = {}): string {
  const { currency = 'USD', compact = false, maximumFractionDigits, signDisplay = 'auto' } = options
  const n = toNumber(value)
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: maximumFractionDigits ?? (compact ? 1 : 2),
    minimumFractionDigits: compact ? 0 : 2,
    signDisplay,
  }).format(n)
}

type PercentOptions = {
  /** Digits after the decimal point. */
  digits?: number
  /** Value is already expressed in percent points (12.5 → "12.5%") instead of a fraction. */
  isPoints?: boolean
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero'
}

/** `0.184` → `18.4%`. Pass `{ isPoints: true }` when the API already returns 18.4. */
export function formatPercent(value: NumberInput, options: PercentOptions = {}): string {
  const { digits = 1, isPoints = false, signDisplay = 'auto' } = options
  const n = toNumber(value)
  if (n === null) return '—'
  const ratio = isPoints ? n / 100 : n
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    signDisplay,
  }).format(ratio)
}

/** Signed delta for KPI chips: `+4.2%` / `-1.1%`. */
export function formatDelta(value: NumberInput, options: PercentOptions = {}): string {
  return formatPercent(value, { ...options, signDisplay: 'exceptZero' })
}

type DateInput = string | number | Date | null | undefined

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value)
  return isValid(date) ? date : null
}

/** `2024-05-02T10:00:00Z` → `May 2, 2024`. */
export function formatDate(value: DateInput, pattern = 'MMM d, yyyy'): string {
  const date = toDate(value)
  return date ? format(date, pattern) : '—'
}

/** `2024-05-02T10:00:00Z` → `May 2, 2024, 10:00 AM`. */
export function formatDateTime(value: DateInput, pattern = 'MMM d, yyyy, h:mm a'): string {
  return formatDate(value, pattern)
}

/** `2024-05-02T10:00:00Z` → `3 days ago`. */
export function formatRelative(value: DateInput): string {
  const date = toDate(value)
  if (!date) return '—'
  const diffMs = Date.now() - date.getTime()
  if (Math.abs(diffMs) < 45_000) return 'just now'
  return formatDistanceToNow(date, { addSuffix: true })
}

/** Short human-readable reference for UUID-ish identifiers: `a1b2c3d4-e5f6…` → `A1B2C3D4`. */
export function formatId(value: string | null | undefined, length = 8): string {
  if (!value) return '—'
  return value.replace(/-/g, '').slice(0, length).toUpperCase()
}

/** Fallback chain for display names. */
export function displayName(value: string | null | undefined, fallback = 'Unknown'): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

/** Initials for avatars: `Ada Lovelace` → `AL`. */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** `in_progress` / `in-progress` → `In progress`. */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—'
  const spaced = value.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Truncate with an ellipsis, never mid-word when avoidable. */
export function truncate(value: string | null | undefined, length = 80): string {
  if (!value) return ''
  return value.length <= length ? value : `${value.slice(0, Math.max(0, length - 1)).trimEnd()}…`
}

/** Clamp a number to a range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Stable key helper for query caches and lists. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
