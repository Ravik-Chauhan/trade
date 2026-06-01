import {
  format,
  isToday,
  isTomorrow,
  isThisYear,
  isPast,
  parseISO,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInCalendarDays,
} from 'date-fns'
import type { RepeatRule } from '../types'

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd')

export function dayKey(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d
  return format(date, 'yyyy-MM-dd')
}

/** Parse a stored due value that may be a date-only or full datetime string. */
export function toDate(value: string): Date {
  return parseISO(value)
}

export function formatDue(value: string | null, hasTime: boolean): string {
  if (!value) return ''
  const d = parseISO(value)
  if (isToday(d)) return hasTime ? `Today ${format(d, 'HH:mm')}` : 'Today'
  if (isTomorrow(d)) return hasTime ? `Tomorrow ${format(d, 'HH:mm')}` : 'Tomorrow'
  const fmt = isThisYear(d) ? 'MMM d' : 'MMM d, yyyy'
  return hasTime ? `${format(d, fmt)} ${format(d, 'HH:mm')}` : format(d, fmt)
}

export function isOverdue(value: string | null): boolean {
  if (!value) return false
  const d = parseISO(value)
  if (isToday(d)) return false
  return isPast(startOfDay(d))
}

export function relativeDays(value: string | null): number | null {
  if (!value) return null
  return differenceInCalendarDays(parseISO(value), startOfDay(new Date()))
}

export function isWithinNext7(value: string | null): boolean {
  const diff = relativeDays(value)
  return diff !== null && diff >= 0 && diff <= 7
}

export function isDueToday(value: string | null): boolean {
  if (!value) return false
  return isToday(parseISO(value))
}

export function isDueTomorrow(value: string | null): boolean {
  if (!value) return false
  return isTomorrow(parseISO(value))
}

/** Compute the next occurrence date for a recurring task after completion. */
export function nextOccurrence(value: string, rule: RepeatRule): string {
  const d = parseISO(value)
  let next: Date
  switch (rule) {
    case 'daily':
      next = addDays(d, 1)
      break
    case 'weekly':
      next = addWeeks(d, 1)
      break
    case 'monthly':
      next = addMonths(d, 1)
      break
    case 'yearly':
      next = addYears(d, 1)
      break
    case 'weekdays': {
      next = addDays(d, 1)
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
      break
    }
    default:
      return value
  }
  // preserve time portion if present
  const hasTime = value.length > 10
  return hasTime ? next.toISOString() : format(next, 'yyyy-MM-dd')
}

export { format, parseISO, isToday, addDays, startOfDay }
