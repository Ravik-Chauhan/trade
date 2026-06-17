import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  matchesFilter,
  matchesSelection,
  searchMatch,
  sortTasks,
  getVisibleTasks,
  countForSelection,
  groupTasks,
  quadrantFor,
} from './selectors'
import type { Task, TaskList, SmartFilter, Priority } from '../types'
import { NO_RECURRENCE } from '../types'

let seq = 0
function makeTask(over: Partial<Task> = {}): Task {
  seq++
  return {
    id: 't' + seq,
    title: 'Task ' + seq,
    notes: '',
    kind: 'task',
    listId: 'inbox',
    completed: false,
    completedAt: null,
    priority: 0,
    dueDate: null,
    startDate: null,
    hasTime: false,
    tags: [],
    subtasks: [],
    recurrence: { ...NO_RECURRENCE },
    reminders: [],
    countdown: false,
    pinned: false,
    order: seq,
    createdAt: '2026-01-01T00:00:00',
    columnId: null,
    ...over,
  }
}

const lists: TaskList[] = [
  { id: 'inbox', name: 'Inbox', color: '#000', emoji: '📥', folderId: null, kanban: false, columns: [], order: 0 },
  { id: 'work', name: 'Work', color: '#f00', emoji: '💼', folderId: null, kanban: false, columns: [], order: 1 },
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-01T12:00:00'))
})
afterEach(() => vi.useRealTimers())

describe('Today + daily tracking', () => {
  it('a tracked task with unfinished slots shows in Today', () => {
    const t = makeTask({ trackingEnabled: true, slots: [{ id: 'm', label: 'M', time: null }], completionLog: {} })
    expect(matchesSelection(t, { kind: 'smart', id: 'today' })).toBe(true)
  })
  it('drops out of Today once all slots are done', () => {
    const t = makeTask({ trackingEnabled: true, slots: [{ id: 'm', label: 'M', time: null }], completionLog: { '2026-06-01': ['m'] } })
    expect(matchesSelection(t, { kind: 'smart', id: 'today' })).toBe(false)
  })
})

describe('notes (note-type items)', () => {
  it('appear only in the Notes smart view, their list, and by tag', () => {
    const note = makeTask({ kind: 'note', listId: 'work', tags: ['ideas'] })
    expect(matchesSelection(note, { kind: 'smart', id: 'notes' })).toBe(true)
    expect(matchesSelection(note, { kind: 'list', id: 'work' })).toBe(true)
    expect(matchesSelection(note, { kind: 'tag', id: 'ideas' })).toBe(true)
  })
  it('are excluded from task-centric smart lists', () => {
    const note = makeTask({ kind: 'note', dueDate: '2026-06-01', priority: 3 })
    expect(matchesSelection(note, { kind: 'smart', id: 'today' })).toBe(false)
    expect(matchesSelection(note, { kind: 'smart', id: 'all' })).toBe(false)
    expect(matchesSelection(note, { kind: 'smart', id: 'high' })).toBe(false)
    expect(matchesSelection(note, { kind: 'smart', id: 'completed' })).toBe(false)
  })
  it('a note in Inbox shows in the Inbox view', () => {
    const note = makeTask({ kind: 'note', listId: 'inbox' })
    expect(matchesSelection(note, { kind: 'smart', id: 'inbox' })).toBe(true)
  })
  it('tasks never match the Notes view', () => {
    expect(matchesSelection(makeTask(), { kind: 'smart', id: 'notes' })).toBe(false)
  })
  it('notes are excluded from custom filters', () => {
    const f = { id: 'f1', name: 'F', listIds: [], priorities: [], tags: [], due: 'any', includeCompleted: true } as SmartFilter
    expect(matchesFilter(makeTask({ kind: 'note' }), f)).toBe(false)
  })
})

describe('matchesSelection', () => {
  it('matches list and tag selections', () => {
    const t = makeTask({ listId: 'work', tags: ['focus'] })
    expect(matchesSelection(t, { kind: 'list', id: 'work' })).toBe(true)
    expect(matchesSelection(t, { kind: 'list', id: 'inbox' })).toBe(false)
    expect(matchesSelection(t, { kind: 'tag', id: 'focus' })).toBe(true)
  })
  it('today includes overdue incomplete tasks', () => {
    const overdue = makeTask({ dueDate: '2026-05-30' })
    const today = makeTask({ dueDate: '2026-06-01' })
    const future = makeTask({ dueDate: '2026-06-05' })
    expect(matchesSelection(overdue, { kind: 'smart', id: 'today' })).toBe(true)
    expect(matchesSelection(today, { kind: 'smart', id: 'today' })).toBe(true)
    expect(matchesSelection(future, { kind: 'smart', id: 'today' })).toBe(false)
  })
  it('overdue matches past-due incomplete tasks only', () => {
    expect(matchesSelection(makeTask({ dueDate: '2026-05-30' }), { kind: 'smart', id: 'overdue' })).toBe(true)
    expect(matchesSelection(makeTask({ dueDate: '2026-05-30', completed: true }), { kind: 'smart', id: 'overdue' })).toBe(false)
    expect(matchesSelection(makeTask({ dueDate: '2026-06-01' }), { kind: 'smart', id: 'overdue' })).toBe(false)
    expect(matchesSelection(makeTask({ dueDate: '2026-06-05' }), { kind: 'smart', id: 'overdue' })).toBe(false)
  })
  it('high matches only priority 3', () => {
    expect(matchesSelection(makeTask({ priority: 3 }), { kind: 'smart', id: 'high' })).toBe(true)
    expect(matchesSelection(makeTask({ priority: 2 }), { kind: 'smart', id: 'high' })).toBe(false)
  })
  it('resolves a filter selection via filters list', () => {
    const f: SmartFilter = { id: 'f1', name: 'x', emoji: '🔎', color: '#000', listIds: ['work'], tags: [], priorities: [], due: 'any', includeCompleted: false }
    const t = makeTask({ listId: 'work' })
    expect(matchesSelection(t, { kind: 'filter', id: 'f1' }, [f])).toBe(true)
    expect(matchesSelection(makeTask({ listId: 'inbox' }), { kind: 'filter', id: 'f1' }, [f])).toBe(false)
  })
})

describe('matchesFilter', () => {
  const base: SmartFilter = { id: 'f', name: '', emoji: '', color: '', listIds: [], tags: [], priorities: [], due: 'any', includeCompleted: false }
  it('combines criteria with AND semantics', () => {
    const f = { ...base, listIds: ['work'], priorities: [3 as Priority], tags: ['urgent'] }
    expect(matchesFilter(makeTask({ listId: 'work', priority: 3, tags: ['urgent'] }), f)).toBe(true)
    expect(matchesFilter(makeTask({ listId: 'work', priority: 2, tags: ['urgent'] }), f)).toBe(false)
    expect(matchesFilter(makeTask({ listId: 'inbox', priority: 3, tags: ['urgent'] }), f)).toBe(false)
  })
  it('tags match ANY of the listed tags', () => {
    const f = { ...base, tags: ['a', 'b'] }
    expect(matchesFilter(makeTask({ tags: ['b'] }), f)).toBe(true)
    expect(matchesFilter(makeTask({ tags: ['c'] }), f)).toBe(false)
  })
  it('excludes completed unless includeCompleted', () => {
    expect(matchesFilter(makeTask({ completed: true }), base)).toBe(false)
    expect(matchesFilter(makeTask({ completed: true }), { ...base, includeCompleted: true })).toBe(true)
  })
  it('due=overdue and due=nodate', () => {
    expect(matchesFilter(makeTask({ dueDate: '2026-05-30' }), { ...base, due: 'overdue' })).toBe(true)
    expect(matchesFilter(makeTask({ dueDate: '2026-06-05' }), { ...base, due: 'overdue' })).toBe(false)
    expect(matchesFilter(makeTask({ dueDate: null }), { ...base, due: 'nodate' })).toBe(true)
    expect(matchesFilter(makeTask({ dueDate: '2026-06-05' }), { ...base, due: 'nodate' })).toBe(false)
  })
})

describe('searchMatch', () => {
  it('matches title, notes, tags and subtasks case-insensitively', () => {
    const t = makeTask({ title: 'Buy Milk', notes: 'from store', tags: ['grocery'], subtasks: [{ id: 's', title: 'oat', done: false }] })
    expect(searchMatch(t, 'milk')).toBe(true)
    expect(searchMatch(t, 'STORE')).toBe(true)
    expect(searchMatch(t, 'grocery')).toBe(true)
    expect(searchMatch(t, 'oat')).toBe(true)
    expect(searchMatch(t, 'xyz')).toBe(false)
    expect(searchMatch(t, '')).toBe(true)
  })
})

describe('sortTasks', () => {
  it('sorts by priority desc then by due date', () => {
    const a = makeTask({ priority: 1, order: 1 })
    const b = makeTask({ priority: 3, order: 2 })
    expect(sortTasks([a, b], 'priority')[0].id).toBe(b.id)
    const c = makeTask({ dueDate: '2026-06-10', order: 1 })
    const d = makeTask({ dueDate: '2026-06-02', order: 2 })
    expect(sortTasks([c, d], 'dueDate')[0].id).toBe(d.id)
  })
  it('tasks without due date sort last', () => {
    const withDate = makeTask({ dueDate: '2026-06-10' })
    const noDate = makeTask({ dueDate: null })
    expect(sortTasks([noDate, withDate], 'dueDate')[0].id).toBe(withDate.id)
  })
  it('sorts by time of day: earliest tracking slot, then due time, untimed last', () => {
    const tracked = makeTask({ id: 'a', trackingEnabled: true, slots: [{ id: 's', label: 'x', time: '09:00' }], completionLog: {} })
    const timed = makeTask({ id: 'b', dueDate: '2026-06-01T15:00:00', hasTime: true })
    const untimed = makeTask({ id: 'c', dueDate: null })
    expect(sortTasks([untimed, timed, tracked], 'time').map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('getVisibleTasks & countForSelection', () => {
  it('hides completed unless showCompleted', () => {
    const tasks = [makeTask({ listId: 'work' }), makeTask({ listId: 'work', completed: true })]
    expect(getVisibleTasks(tasks, { kind: 'list', id: 'work' }, '', 'manual', false).length).toBe(1)
    expect(getVisibleTasks(tasks, { kind: 'list', id: 'work' }, '', 'manual', true).length).toBe(2)
  })
  it('completed smart list shows only completed', () => {
    const tasks = [makeTask({ completed: true }), makeTask()]
    expect(getVisibleTasks(tasks, { kind: 'smart', id: 'completed' }, '', 'manual', false).length).toBe(1)
  })
  it('countForSelection ignores completed', () => {
    const tasks = [makeTask({ listId: 'work' }), makeTask({ listId: 'work', completed: true })]
    expect(countForSelection(tasks, { kind: 'list', id: 'work' })).toBe(1)
  })
})

describe('groupTasks', () => {
  it('returns a single bucket for none', () => {
    const tasks = [makeTask(), makeTask()]
    const b = groupTasks(tasks, 'none', lists)
    expect(b.length).toBe(1)
    expect(b[0].tasks.length).toBe(2)
  })
  it('groups by list with labels', () => {
    const tasks = [makeTask({ listId: 'work' }), makeTask({ listId: 'inbox' })]
    const b = groupTasks(tasks, 'list', lists)
    expect(b.length).toBe(2)
    expect(b.find((x) => x.key === 'work')?.title).toContain('Work')
  })
  it('groups by priority in descending order', () => {
    const tasks = [makeTask({ priority: 1 }), makeTask({ priority: 3 })]
    const b = groupTasks(tasks, 'priority', lists)
    expect(b[0].key).toBe('p3')
  })
})

describe('quadrantFor (Eisenhower)', () => {
  it('important + urgent => do', () => {
    expect(quadrantFor(makeTask({ priority: 3, dueDate: '2026-06-01' }))).toBe('do')
  })
  it('important + not urgent => schedule', () => {
    expect(quadrantFor(makeTask({ priority: 3, dueDate: '2026-06-20' }))).toBe('schedule')
  })
  it('not important + urgent => delegate', () => {
    expect(quadrantFor(makeTask({ priority: 1, dueDate: '2026-06-01' }))).toBe('delegate')
  })
  it('neither => eliminate', () => {
    expect(quadrantFor(makeTask({ priority: 0, dueDate: null }))).toBe('eliminate')
  })
})
