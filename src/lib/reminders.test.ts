import { describe, it, expect } from 'vitest'
import { collectReminders, dueReminders } from './reminders'
import type { Task, Habit } from '../types'
import { NO_RECURRENCE } from '../types'

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'Pay rent', notes: '', listId: 'inbox', completed: false, completedAt: null,
    priority: 0, dueDate: '2026-06-02', startDate: null, hasTime: false, tags: [], subtasks: [],
    recurrence: { ...NO_RECURRENCE }, reminders: [], countdown: false, pinned: false, order: 0,
    createdAt: '2026-01-01T00:00:00', columnId: null, ...over,
  }
}

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: 'Workout', emoji: '💪', color: '#000', goal: 1, unit: 'session',
    freq: { type: 'daily', days: [], timesPerWeek: 7 }, reminderTime: '18:00',
    archived: false, createdAt: '2026-01-01T00:00:00', log: {}, ...over,
  }
}

describe('collectReminders', () => {
  it('creates an instance per task reminder with a stable key', () => {
    const t = task({ reminders: ['2026-06-02T09:00', '2026-06-02T17:00'] })
    const out = collectReminders([t], [], new Date('2026-06-02T08:00:00'))
    expect(out).toHaveLength(2)
    expect(out[0].key).toBe('task:t1:2026-06-02T09:00')
    expect(out[0].title).toBe('Pay rent')
  })

  it('ignores completed tasks', () => {
    const t = task({ completed: true, reminders: ['2026-06-02T09:00'] })
    expect(collectReminders([t], [], new Date('2026-06-02T08:00:00'))).toHaveLength(0)
  })

  it('adds a habit reminder for today when not yet done', () => {
    const out = collectReminders([], [habit()], new Date('2026-06-02T08:00:00'))
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('habit:h1:2026-06-02')
  })

  it('skips a habit already completed today', () => {
    const h = habit({ log: { '2026-06-02': 1 } })
    expect(collectReminders([], [h], new Date('2026-06-02T08:00:00'))).toHaveLength(0)
  })

  it('skips a habit on a non-required weekday', () => {
    // 2026-06-02 is a Tuesday (day 2); restrict habit to weekends
    const h = habit({ freq: { type: 'daily', days: [0, 6], timesPerWeek: 2 } })
    expect(collectReminders([], [h], new Date('2026-06-02T08:00:00'))).toHaveLength(0)
  })

  it('skips archived habits and those without a reminder time', () => {
    expect(collectReminders([], [habit({ archived: true })], new Date('2026-06-02T08:00:00'))).toHaveLength(0)
    expect(collectReminders([], [habit({ reminderTime: null })], new Date('2026-06-02T08:00:00'))).toHaveLength(0)
  })
})

describe('dueReminders', () => {
  const all = collectReminders([task({ reminders: ['2026-06-02T09:00', '2026-06-02T17:00'] })], [], new Date('2026-06-02T08:00:00'))

  it('returns only reminders whose time has elapsed', () => {
    const now = Date.parse('2026-06-02T10:00:00')
    const due = dueReminders(all, now, new Set())
    expect(due).toHaveLength(1)
    expect(due[0].key).toContain('09:00')
  })

  it('excludes reminders already fired', () => {
    const now = Date.parse('2026-06-02T18:00:00')
    const fired = new Set(['task:t1:2026-06-02T09:00'])
    const due = dueReminders(all, now, fired)
    expect(due.map((d) => d.key)).toEqual(['task:t1:2026-06-02T17:00'])
  })

  it('returns nothing before any reminder time', () => {
    expect(dueReminders(all, Date.parse('2026-06-02T07:00:00'), new Set())).toHaveLength(0)
  })
})
