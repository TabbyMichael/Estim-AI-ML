import {
  clamp,
  cn,
  displayName,
  formatCompact,
  formatCurrency,
  formatDate,
  formatDelta,
  formatId,
  formatNumber,
  formatPercent,
  formatRelative,
  humanize,
  initials,
  slugify,
  truncate,
} from '@/lib/utils'

describe('cn', () => {
  it('merges conflicting Tailwind classes, keeping the last value', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('ignores falsy inputs', () => {
    expect(cn('text-sm', false, null, undefined, 'font-medium')).toBe('text-sm font-medium')
  })
})

describe('number formatting', () => {
  it('formats numbers with grouping and safe fallbacks', () => {
    expect(formatNumber(1234.5)).toBe('1,235')
    expect(formatNumber(1234.5, 1)).toBe('1,234.5')
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(Number.NaN)).toBe('—')
  })

  it('formats compact values for dense labels', () => {
    expect(formatCompact(1_250_000)).toBe('1.3M')
    expect(formatCompact(undefined)).toBe('—')
  })

  it('formats currency, including compact notation', () => {
    expect(formatCurrency(12345.67)).toBe('$12,345.67')
    expect(formatCurrency(12345.67, { compact: true })).toBe('$12.3K')
    expect(formatCurrency(null)).toBe('—')
  })

  it('formats fractions and percentage points', () => {
    expect(formatPercent(0.184)).toBe('18.4%')
    expect(formatPercent(18.4, { isPoints: true })).toBe('18.4%')
    expect(formatPercent(0.5, { digits: 0 })).toBe('50%')
    expect(formatPercent(null)).toBe('—')
  })

  it('always shows the sign for non-zero deltas', () => {
    expect(formatDelta(0.042)).toBe('+4.2%')
    expect(formatDelta(-0.011)).toBe('-1.1%')
    expect(formatDelta(0)).toBe('0%')
  })
})

describe('date formatting', () => {
  it('formats ISO dates and tolerates empty input', () => {
    expect(formatDate('2024-05-02', 'yyyy-MM-dd')).toBe('2024-05-02')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('describes recent timestamps relatively', () => {
    expect(formatRelative(new Date().toISOString())).toBe('just now')
    expect(formatRelative(undefined)).toBe('—')
  })
})

describe('identity helpers', () => {
  it('shortens identifiers', () => {
    expect(formatId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('A1B2C3D4')
    expect(formatId(undefined)).toBe('—')
  })

  it('falls back for missing display names', () => {
    expect(displayName('  Ada Lovelace  ')).toBe('Ada Lovelace')
    expect(displayName('   ')).toBe('Unknown')
    expect(displayName(null, 'Operator')).toBe('Operator')
  })

  it('derives up to two initials', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('Alex')).toBe('A')
    expect(initials(null)).toBe('?')
  })
})

describe('text helpers', () => {
  it('humanizes snake and kebab case values', () => {
    expect(humanize('in_progress')).toBe('In progress')
    expect(humanize('at-risk')).toBe('At risk')
    expect(humanize(undefined)).toBe('—')
  })

  it('truncates with an ellipsis without exceeding the limit', () => {
    const result = truncate('The quick brown fox', 10)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(10)
    expect(truncate('short', 10)).toBe('short')
  })

  it('creates stable slugs', () => {
    expect(slugify('  Northgate Tower — Phase 2 ')).toBe('northgate-tower-phase-2')
  })
})

describe('clamp', () => {
  it('bounds values to the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-2, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })
})
