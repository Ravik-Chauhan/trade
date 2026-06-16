import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  stepDate,
  advanceRecurrence,
  recurrenceLabel,
  formatDue,
  isOverdue,
  relativeDays,
  isWithinNext7,
  isDueToday,
  isDueTomorrow,
  toggleOccurrence,
} from './date'
import type { Recurrence } from '../types'
import { NO_RECURRENCE } from '../types'

const rec = (over: Partial<Recurrence>): Recurrence => ({ ...NO_RECURRENCE, ...over })

describe('toggleOccurrence', () => {
  it('adds an unlogged day without changing the due date', () => {
    const r = toggleOccurrence(['2026-06-15'], '2026-06-22T10:00:00', '2026-06-08')
    expect(r.recurrenceLog).toEqual(['2026-06-15', '2026-06-08'])
    expect(r.dueDate).toBe('2026-06-22T10:00:00')
  })

  it('removes a logged day earlier than due and rolls the due date back, keeping the time', () => {
    const r = toggleOccurrence(['2026-06-15', '2026-06-22'], '2026-06-29T10:00:00', '2026-06-22')
    expect(r.recurrenceLog).toEqual(['2026-06-15'])
    expect(r.dueDate).toBe('2026-06-22T10:00:00')
  })

  it('removing a day on/after the due date leaves the due date alone', () => {
    const r = toggleOccurrence(['2026-06-29'], '2026-06-22T10:00:00', '2026-06-29')
    expect(r.recurrenceLog).toEqual([])
    expect(r.dueDate).toBe('2026-06-22T10:00:00')
  })

  it('preserves a date-only due date when rolling back', () => {
    const r = toggleOccurrence(['2026-06-22'], '2026-06-29', '2026-06-22')
    expect(r.dueDate).toBe('2026-06-22')
  })
})

describe('stepDate', () => {
  it('advances by N days', () => {
    expect(stepDate('2026-06-01', 'daily', 1)).toBe('2026-06-02')
    expect(stepDate('2026-06-01', 'daily', 5)).toBe('2026-06-06')
  })
  it('advances weekly / monthly / yearly with interval', () => {
    expect(stepDate('2026-06-01', 'weekly', 2)).toBe('2026-06-15')
    expect(stepDate('2026-06-01', 'monthly', 1)).toBe('2026-07-01')
    expect(stepDate('2026-06-01', 'yearly', 1)).toBe('2027-06-01')
  })
  it('weekdays skips weekends (2026-06-05 is a Friday → Monday)', () => {
    expect(stepDate('2026-06-05', 'weekdays')).toBe('2026-06-08')
  })
  it('preserves time portion when present', () => {
    const out = stepDate('2026-06-01T09:30:00', 'daily', 1)
    expect(out.startsWith('2026-06-02')).toBe(true)
  })
  it('returns unchanged for none', () => {
    expect(stepDate('2026-06-01', 'none')).toBe('2026-06-01')
  })
})

describe('advanceRecurrence', () => {
  it('returns null for non-recurring', () => {
    expect(advanceRecurrence('2026-06-01', rec({ rule: 'none' })).date).toBeNull()
  })
  it('rolls forward with never-end and increments count', () => {
    const r = advanceRecurrence('2026-06-01', rec({ rule: 'daily', interval: 2 }))
    expect(r.date).toBe('2026-06-03')
    expect(r.recurrence.count).toBe(1)
  })
  it('ends after N occurrences', () => {
    const r1 = advanceRecurrence('2026-06-01', rec({ rule: 'daily', endType: 'afterCount', endCount: 2, count: 0 }))
    expect(r1.date).toBe('2026-06-02')
    const r2 = advanceRecurrence(r1.date!, { ...r1.recurrence })
    expect(r2.date).toBeNull() // second completion ends the series
  })
  it('ends on a fixed date', () => {
    const r = advanceRecurrence('2026-06-30', rec({ rule: 'daily', endType: 'onDate', endDate: '2026-06-30' }))
    expect(r.date).toBeNull()
  })
  it('continues when next is before end date', () => {
    const r = advanceRecurrence('2026-06-01', rec({ rule: 'daily', endType: 'onDate', endDate: '2026-06-30' }))
    expect(r.date).toBe('2026-06-02')
  })

  // 2026-06-01 is a Monday.
  it('custom weekly steps to the next selected weekday', () => {
    const monThu = rec({ rule: 'custom', customUnit: 'week', weekdays: [1, 4] })
    expect(advanceRecurrence('2026-06-01', monThu).date).toBe('2026-06-04') // Mon -> Thu
    expect(advanceRecurrence('2026-06-04', monThu).date).toBe('2026-06-08') // Thu -> next Mon
  })
  it('custom monthly steps to the next selected month-day, crossing months', () => {
    const r = rec({ rule: 'custom', customUnit: 'month', monthDays: [2, 14] })
    expect(advanceRecurrence('2026-06-01', r).date).toBe('2026-06-02')
    expect(advanceRecurrence('2026-06-02', r).date).toBe('2026-06-14')
    expect(advanceRecurrence('2026-06-14', r).date).toBe('2026-07-02')
  })
  it('custom monthly skips month-days that do not exist (31st past Feb)', () => {
    const r = rec({ rule: 'custom', customUnit: 'month', monthDays: [31] })
    expect(advanceRecurrence('2026-01-31', r).date).toBe('2026-03-31') // skips Feb
  })
  // Timed due dates are stored as local naive strings; advancing must not
  // convert to UTC (which shifted early-morning times back a day).
  it('keeps the local day/time for timed tasks (no UTC shift)', () => {
    // 2026-06-02 is Tuesday; repeat Tue & Fri at 01:05 -> next is Fri the 5th
    const r = rec({ rule: 'custom', customUnit: 'week', weekdays: [2, 5] })
    expect(advanceRecurrence('2026-06-02T01:05:00', r).date).toBe('2026-06-05T01:05:00')
    // simple daily keeps the same wall-clock time too
    expect(advanceRecurrence('2026-06-01T01:05:00', rec({ rule: 'daily' })).date).toBe('2026-06-02T01:05:00')
  })
})

describe('recurrenceLabel', () => {
  it('labels common rules', () => {
    expect(recurrenceLabel(rec({ rule: 'none' }))).toBe('No repeat')
    expect(recurrenceLabel(rec({ rule: 'daily', interval: 1 }))).toBe('Every day')
    expect(recurrenceLabel(rec({ rule: 'weekly', interval: 3 }))).toBe('Every 3 weeks')
    expect(recurrenceLabel(rec({ rule: 'weekdays' }))).toBe('Every weekday')
  })
  it('appends end conditions', () => {
    expect(recurrenceLabel(rec({ rule: 'daily', endType: 'afterCount', endCount: 5 }))).toContain('5×')
    expect(recurrenceLabel(rec({ rule: 'daily', endType: 'onDate', endDate: '2026-12-31' }))).toContain('until 2026-12-31')
  })
  it('labels custom rules', () => {
    expect(recurrenceLabel(rec({ rule: 'custom', customUnit: 'week', weekdays: [1, 4] }))).toBe('Weekly on Mon, Thu')
    expect(recurrenceLabel(rec({ rule: 'custom', customUnit: 'month', monthDays: [14, 2] }))).toBe('Monthly on 2nd, 14th')
  })
})

describe('relative date helpers (clock pinned to 2026-06-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('isDueToday / isDueTomorrow', () => {
    expect(isDueToday('2026-06-01')).toBe(true)
    expect(isDueToday('2026-06-02')).toBe(false)
    expect(isDueTomorrow('2026-06-02')).toBe(true)
  })
  it('isOverdue is true for past, false for today/future/null', () => {
    expect(isOverdue('2026-05-31')).toBe(true)
    expect(isOverdue('2026-06-01')).toBe(false)
    expect(isOverdue('2026-06-02')).toBe(false)
    expect(isOverdue(null)).toBe(false)
  })
  it('relativeDays computes calendar day difference', () => {
    expect(relativeDays('2026-06-01')).toBe(0)
    expect(relativeDays('2026-06-04')).toBe(3)
    expect(relativeDays('2026-05-30')).toBe(-2)
  })
  it('isWithinNext7 covers today..+7', () => {
    expect(isWithinNext7('2026-06-01')).toBe(true)
    expect(isWithinNext7('2026-06-08')).toBe(true)
    expect(isWithinNext7('2026-06-09')).toBe(false)
    expect(isWithinNext7('2026-05-31')).toBe(false)
  })
  it('formatDue renders Today/Tomorrow and times', () => {
    expect(formatDue('2026-06-01', false)).toBe('Today')
    expect(formatDue('2026-06-02', false)).toBe('Tomorrow')
    expect(formatDue('2026-06-01T09:30:00', true)).toBe('Today 09:30')
  })
})
