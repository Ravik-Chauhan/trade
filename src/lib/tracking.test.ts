import { describe, it, expect } from 'vitest'
import { format, addDays, parseISO } from 'date-fns'
import { slotDone, toggleSlotLog, dayProgress, trackingStreak, makeSlot, SLOT_PRESETS } from './tracking'
import type { Task } from '../types'
import { NO_RECURRENCE } from '../types'

const dayBefore = (key: string, n: number) => format(addDays(parseISO(key), -n), 'yyyy-MM-dd')

function trackedTask(over: Partial<Task> = {}): Task {
  return {
    id: 'meds', title: 'Take meds', notes: '', listId: 'inbox', completed: false, completedAt: null,
    priority: 0, dueDate: null, startDate: null, hasTime: false, tags: [], subtasks: [],
    recurrence: { ...NO_RECURRENCE }, reminders: [], countdown: false,
    trackingEnabled: true,
    slots: [{ id: 'm', label: 'Morning', time: '08:00' }, { id: 'e', label: 'Evening', time: '20:00' }],
    completionLog: {}, pinned: false, order: 0, createdAt: '2026-01-01T00:00:00', columnId: null, ...over,
  }
}

describe('toggleSlotLog', () => {
  it('adds a slot id to a day', () => {
    const log = toggleSlotLog({}, '2026-06-02', 'm')
    expect(log['2026-06-02']).toEqual(['m'])
  })
  it('removes a slot id and deletes empty days', () => {
    const log = toggleSlotLog({ '2026-06-02': ['m'] }, '2026-06-02', 'm')
    expect(log['2026-06-02']).toBeUndefined()
  })
  it('keeps other slots on the same day', () => {
    const log = toggleSlotLog({ '2026-06-02': ['m', 'e'] }, '2026-06-02', 'm')
    expect(log['2026-06-02']).toEqual(['e'])
  })
})

describe('slotDone & dayProgress', () => {
  it('reports per-slot and aggregate completion', () => {
    const t = trackedTask({ completionLog: { '2026-06-02': ['m'] } })
    expect(slotDone(t, '2026-06-02', 'm')).toBe(true)
    expect(slotDone(t, '2026-06-02', 'e')).toBe(false)
    expect(dayProgress(t, '2026-06-02')).toEqual({ done: 1, total: 2 })
    expect(dayProgress(t, '2026-06-03')).toEqual({ done: 0, total: 2 })
  })
})

describe('trackingStreak', () => {
  it('counts consecutive fully-completed days ending today', () => {
    const today = '2026-06-02'
    const log: Record<string, string[]> = {}
    log[today] = ['m', 'e']
    log[dayBefore(today, 1)] = ['m', 'e']
    log[dayBefore(today, 2)] = ['m', 'e']
    const t = trackedTask({ completionLog: log })
    expect(trackingStreak(t, today, dayBefore)).toBe(3)
  })
  it('does not break when today is not yet complete', () => {
    const today = '2026-06-02'
    const log: Record<string, string[]> = {}
    log[dayBefore(today, 1)] = ['m', 'e']
    log[dayBefore(today, 2)] = ['m', 'e']
    const t = trackedTask({ completionLog: log })
    expect(trackingStreak(t, today, dayBefore)).toBe(2)
  })
  it('breaks on a partially completed past day', () => {
    const today = '2026-06-02'
    const log: Record<string, string[]> = {}
    log[today] = ['m', 'e']
    log[dayBefore(today, 1)] = ['m'] // only morning -> breaks streak
    const t = trackedTask({ completionLog: log })
    expect(trackingStreak(t, today, dayBefore)).toBe(1)
  })
})

describe('makeSlot & presets', () => {
  it('creates slots with unique ids', () => {
    const a = makeSlot('Morning', '08:00')
    const b = makeSlot('Evening')
    expect(a.id).not.toBe(b.id)
    expect(a.time).toBe('08:00')
    expect(b.time).toBeNull()
  })
  it('exposes a Morning & Evening preset', () => {
    const preset = SLOT_PRESETS.find((p) => p.label === 'Morning & Evening')!
    expect(preset.slots.map((s) => s.label)).toEqual(['Morning', 'Evening'])
  })
})
