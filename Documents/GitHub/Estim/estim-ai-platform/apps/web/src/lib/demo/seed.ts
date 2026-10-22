/** Shared helpers for demo fixtures (all timestamps are relative to now). */

const DAY = 86_400_000
const HOUR = 3_600_000

export const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString()
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString()
export const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString()

export function demoDate(daysOffset: number) {
  return new Date(Date.now() + daysOffset * DAY)
}

export function isoDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

/** Stable pseudo-random numbers so fixtures look alive but don't jitter. */
export function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 214_748_3647
    return (value - 1) / 214_748_3646
  }
}
