import { describe, it, expect } from 'vitest'
import { itemsForDay, overdueItems } from './calendarItems'
import type { Task } from '../types'
import { NO_RECURRENCE } from '../types'

const base = (over: Partial<Task>): Task => ({
  id: over.id ?? 't', title: 'T', notes: '', kind: 'task', listId: 'inbox', columnId: null,
  dueDate: null, hasTime: false, startDate: null, priority: 0, tags: [], completed: false,
  completedAt: null, pinned: false, countdown: false, recurrence: { ...NO_RECURRENCE },
  recurrenceLog: [], reminders: [], subtasks: [], createdAt: '', order: 0, hidePrivate: false,
  trackingEnabled: false, slots: [], completionLog: {}, ...over,
})

describe('itemsForDay', () => {
  it('includes a task due on that day, with its time', () => {
    const t = base({ id: 'a', title: 'Derma', dueDate: '2026-06-17T10:00:00', hasTime: true })
    const items = itemsForDay([t], '2026-06-17')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ taskId: 'a', title: 'Derma', time: '10:00', tracking: false })
  })

  it('excludes a task due on a different day', () => {
    const t = base({ dueDate: '2026-06-18T10:00:00', hasTime: true })
    expect(itemsForDay([t], '2026-06-17')).toHaveLength(0)
  })

  it('emits a tracking task slot for every day, with completed reflecting the log', () => {
    const t = base({
      id: 'm', title: 'Meds', trackingEnabled: true,
      slots: [{ id: 's1', label: 'Morning', time: '08:00' }, { id: 's2', label: 'Evening', time: '21:00' }],
      completionLog: { '2026-06-17': ['s1'] },
    })
    const items = itemsForDay([t], '2026-06-17')
    expect(items.map((i) => i.title)).toEqual(['Meds · Morning', 'Meds · Evening'])
    expect(items[0]).toMatchObject({ time: '08:00', completed: true, tracking: true })
    expect(items[1]).toMatchObject({ time: '21:00', completed: false })
  })

  it('sorts timed items before untimed ones', () => {
    const timed = base({ id: 'a', dueDate: '2026-06-17T09:00:00', hasTime: true })
    const untimed = base({ id: 'b', dueDate: '2026-06-17' })
    const items = itemsForDay([untimed, timed], '2026-06-17')
    expect(items.map((i) => i.taskId)).toEqual(['a', 'b'])
  })
})

describe('overdueItems', () => {
  it('returns incomplete due-dated tasks before today and skips today/tracking/done', () => {
    const past = base({ id: 'p', title: 'Late', dueDate: '2026-06-10' })
    const today = base({ id: 't', dueDate: '2026-06-17' })
    const doneLate = base({ id: 'd', dueDate: '2026-06-09', completed: true })
    const tracked = base({ id: 'm', trackingEnabled: true, dueDate: '2026-06-01' })
    const items = overdueItems([past, today, doneLate, tracked], '2026-06-17')
    expect(items.map((i) => i.taskId)).toEqual(['p'])
  })
})
