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
import type { RepeatRule, Recurrence } from '../types'

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

/** Compute the raw next date for a repeat rule, honoring an interval. */
export function stepDate(value: string, rule: RepeatRule, interval = 1): string {
  const d = parseISO(value)
  const n = Math.max(1, interval)
  let next: Date
  switch (rule) {
    case 'daily':
      next = addDays(d, n)
      break
    case 'weekly':
      next = addWeeks(d, n)
      break
    case 'monthly':
      next = addMonths(d, n)
      break
    case 'yearly':
      next = addYears(d, n)
      break
    case 'weekdays': {
      next = addDays(d, 1)
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
      break
    }
    default:
      return value
  }
  const hasTime = value.length > 10
  return hasTime ? format(next, "yyyy-MM-dd'T'HH:mm:ss") : format(next, 'yyyy-MM-dd')
}

/** @deprecated kept for compatibility — single-step advance. */
export function nextOccurrence(value: string, rule: RepeatRule): string {
  return stepDate(value, rule, 1)
}

/**
 * Next date for a 'custom' recurrence: the soonest day strictly after `value`
 * that lands on one of the selected weekdays (customUnit 'week') or month-days
 * (customUnit 'month'). Falls back to a plain weekly/monthly step when no days
 * are selected. Month-days that don't exist in a given month are skipped
 * naturally (e.g. the 31st in February).
 */
function stepCustom(value: string, rec: Recurrence): string {
  const d = parseISO(value)
  const hasTime = value.length > 10
  const fmt = (x: Date) => (hasTime ? format(x, "yyyy-MM-dd'T'HH:mm:ss") : format(x, 'yyyy-MM-dd'))
  const week = rec.customUnit === 'week'
  const days = week ? rec.weekdays ?? [] : rec.monthDays ?? []
  if (days.length === 0) return stepDate(value, week ? 'weekly' : 'monthly', rec.interval)
  const match = (x: Date) => (week ? days.includes(x.getDay()) : days.includes(x.getDate()))
  let next = addDays(d, 1)
  for (let i = 0; i < 400 && !match(next); i++) next = addDays(next, 1)
  return fmt(next)
}

export interface AdvanceResult {
  date: string | null // null when the series has ended
  recurrence: Recurrence
}

/**
 * Advance a recurring task to its next occurrence, applying interval and end
 * conditions. Returns `date: null` when the recurrence has finished, signalling
 * the caller to actually complete the task.
 */
export function advanceRecurrence(value: string, rec: Recurrence): AdvanceResult {
  if (rec.rule === 'none') return { date: null, recurrence: rec }
  const next = rec.rule === 'custom' ? stepCustom(value, rec) : stepDate(value, rec.rule, rec.interval)
  const newCount = rec.count + 1

  if (rec.endType === 'afterCount' && newCount >= rec.endCount) {
    return { date: null, recurrence: { ...rec, count: newCount } }
  }
  if (rec.endType === 'onDate' && rec.endDate) {
    const nextDay = next.slice(0, 10)
    if (nextDay > rec.endDate) {
      return { date: null, recurrence: { ...rec, count: newCount } }
    }
  }
  return { date: next, recurrence: { ...rec, count: newCount } }
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function recurrenceLabel(rec: Recurrence): string {
  if (rec.rule === 'none') return 'No repeat'
  if (rec.rule === 'custom') {
    if (rec.customUnit === 'week') {
      const sel = [...(rec.weekdays ?? [])].sort((a, b) => a - b).map((i) => WEEKDAY_NAMES[i])
      const days = sel.length ? sel.join(', ') : 'every day'
      let base = `Weekly on ${days}`
      if (rec.endType === 'afterCount') base += ` · ${rec.endCount}×`
      if (rec.endType === 'onDate' && rec.endDate) base += ` · until ${rec.endDate}`
      return base
    }
    const sel = [...(rec.monthDays ?? [])].sort((a, b) => a - b).map(ordinal)
    const days = sel.length ? sel.join(', ') : 'every day'
    let base = `Monthly on ${days}`
    if (rec.endType === 'afterCount') base += ` · ${rec.endCount}×`
    if (rec.endType === 'onDate' && rec.endDate) base += ` · until ${rec.endDate}`
    return base
  }
  const unit: Record<RepeatRule, string> = {
    none: '',
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year',
    weekdays: 'weekday',
    custom: '',
  }
  let base: string
  if (rec.rule === 'weekdays') base = 'Every weekday'
  else if (rec.interval === 1) base = `Every ${unit[rec.rule]}`
  else base = `Every ${rec.interval} ${unit[rec.rule]}s`
  if (rec.endType === 'afterCount') base += ` · ${rec.endCount}×`
  if (rec.endType === 'onDate' && rec.endDate) base += ` · until ${rec.endDate}`
  return base
}

export { format, parseISO, isToday, addDays, startOfDay }
