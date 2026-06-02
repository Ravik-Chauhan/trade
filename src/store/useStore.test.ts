import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './useStore'
import type { Settings, TaskList } from '../types'

const settings: Settings = {
  theme: 'system', accent: '#4772fa', focusMinutes: 25, shortBreak: 5, longBreak: 15,
  longBreakEvery: 4, weekStartsMonday: true, showCompleted: false,
}
const inbox: TaskList = { id: 'inbox', name: 'Inbox', color: '#000', emoji: '📥', folderId: null, kanban: false, columns: [], order: 0 }

beforeEach(() => {
  useStore.setState({ tasks: [], lists: [inbox], folders: [], tags: [], filters: [], habits: [], pomodoros: [], settings })
})

const S = () => useStore.getState()

describe('task CRUD', () => {
  it('adds a task with sane defaults', () => {
    const id = S().addTask({ title: '  Hello  ', listId: 'inbox' })
    const t = S().tasks.find((x) => x.id === id)!
    expect(t.title).toBe('Hello')
    expect(t.completed).toBe(false)
    expect(t.recurrence.rule).toBe('none')
    expect(t.reminders).toEqual([])
    expect(t.countdown).toBe(false)
  })

  it('updates a task', () => {
    const id = S().addTask({ title: 'x', listId: 'inbox' })
    S().updateTask(id, { priority: 3, notes: 'n' })
    const t = S().tasks.find((x) => x.id === id)!
    expect(t.priority).toBe(3)
    expect(t.notes).toBe('n')
  })

  it('deletes a task', () => {
    const id = S().addTask({ title: 'x', listId: 'inbox' })
    S().deleteTask(id)
    expect(S().tasks.length).toBe(0)
  })

  it('duplicates a task with fresh id and (copy) suffix', () => {
    const id = S().addTask({ title: 'Orig', listId: 'inbox', subtasks: [{ id: 's', title: 'a', done: true }] })
    S().duplicateTask(id)
    const copy = S().tasks.find((t) => t.title === 'Orig (copy)')!
    expect(copy).toBeTruthy()
    expect(copy.id).not.toBe(id)
    expect(copy.subtasks[0].id).not.toBe('s')
    expect(copy.completed).toBe(false)
  })

  it('moveTask changes list and column', () => {
    const id = S().addTask({ title: 'x', listId: 'inbox' })
    S().moveTask(id, 'work', 'col1')
    const t = S().tasks.find((x) => x.id === id)!
    expect(t.listId).toBe('work')
    expect(t.columnId).toBe('col1')
  })
})

describe('toggleTask', () => {
  it('completes a normal task and sets completedAt', () => {
    const id = S().addTask({ title: 'x', listId: 'inbox' })
    S().toggleTask(id)
    const t = S().tasks.find((x) => x.id === id)!
    expect(t.completed).toBe(true)
    expect(t.completedAt).not.toBeNull()
  })

  it('un-completes a completed task', () => {
    const id = S().addTask({ title: 'x', listId: 'inbox' })
    S().toggleTask(id)
    S().toggleTask(id)
    expect(S().tasks.find((x) => x.id === id)!.completed).toBe(false)
  })

  it('rolls a recurring task forward instead of completing', () => {
    const id = S().addTask({
      title: 'repeat', listId: 'inbox', dueDate: '2026-06-01',
      recurrence: { rule: 'daily', interval: 1, endType: 'never', endDate: null, endCount: 10, count: 0 },
      subtasks: [{ id: 's', title: 'a', done: true }],
    })
    S().toggleTask(id)
    const t = S().tasks.find((x) => x.id === id)!
    expect(t.completed).toBe(false)
    expect(t.dueDate).toBe('2026-06-02')
    expect(t.recurrence.count).toBe(1)
    expect(t.subtasks[0].done).toBe(false) // subtasks reset for the next occurrence
  })

  it('completes a recurring task when the series has ended', () => {
    const id = S().addTask({
      title: 'last', listId: 'inbox', dueDate: '2026-06-01',
      recurrence: { rule: 'daily', interval: 1, endType: 'afterCount', endDate: null, endCount: 1, count: 0 },
    })
    S().toggleTask(id)
    expect(S().tasks.find((x) => x.id === id)!.completed).toBe(true)
  })
})

describe('subtasks', () => {
  it('adds, toggles, updates and deletes subtasks', () => {
    const id = S().addTask({ title: 'x', listId: 'inbox' })
    S().addSubtask(id, 'one')
    let t = S().tasks.find((x) => x.id === id)!
    const sid = t.subtasks[0].id
    expect(t.subtasks[0].title).toBe('one')
    S().toggleSubtask(id, sid)
    expect(S().tasks.find((x) => x.id === id)!.subtasks[0].done).toBe(true)
    S().updateSubtask(id, sid, 'renamed')
    expect(S().tasks.find((x) => x.id === id)!.subtasks[0].title).toBe('renamed')
    S().deleteSubtask(id, sid)
    t = S().tasks.find((x) => x.id === id)!
    expect(t.subtasks.length).toBe(0)
  })
})

describe('notes', () => {
  it('defaults new items to task kind', () => {
    const id = S().addTask({ title: 'A task', listId: 'inbox' })
    expect(S().tasks.find((t) => t.id === id)!.kind).toBe('task')
  })
  it('creates note-type items and they are never completed by default', () => {
    const id = S().addTask({ title: 'My note', kind: 'note', listId: 'inbox', notes: 'body' })
    const note = S().tasks.find((t) => t.id === id)!
    expect(note.kind).toBe('note')
    expect(note.completed).toBe(false)
  })
  it('can convert a task into a note', () => {
    const id = S().addTask({ title: 'Convert me', listId: 'inbox' })
    S().updateTask(id, { kind: 'note' })
    expect(S().tasks.find((t) => t.id === id)!.kind).toBe('note')
  })
})

describe('daily tracking', () => {
  it('enabling tracking seeds a default slot', () => {
    const id = S().addTask({ title: 'Meds', listId: 'inbox' })
    S().setTracking(id, true)
    const t = S().tasks.find((x) => x.id === id)!
    expect(t.trackingEnabled).toBe(true)
    expect(t.slots.length).toBe(1)
  })

  it('setSlots replaces the slot list', () => {
    const id = S().addTask({ title: 'Meds', listId: 'inbox' })
    S().setSlots(id, [{ id: 'm', label: 'Morning', time: '08:00' }, { id: 'e', label: 'Evening', time: '20:00' }])
    expect(S().tasks.find((x) => x.id === id)!.slots.length).toBe(2)
  })

  it('toggleSlot records and clears a slot for a day', () => {
    const id = S().addTask({ title: 'Meds', listId: 'inbox', trackingEnabled: true, slots: [{ id: 'm', label: 'Morning', time: null }] })
    S().toggleSlot(id, '2026-06-02', 'm')
    expect(S().tasks.find((x) => x.id === id)!.completionLog['2026-06-02']).toEqual(['m'])
    S().toggleSlot(id, '2026-06-02', 'm')
    expect(S().tasks.find((x) => x.id === id)!.completionLog['2026-06-02']).toBeUndefined()
  })
})

describe('lists & folders', () => {
  it('deleting a list reassigns its tasks to inbox', () => {
    const listId = S().addList('Work')
    const id = S().addTask({ title: 'x', listId })
    S().deleteList(listId)
    expect(S().lists.find((l) => l.id === listId)).toBeUndefined()
    expect(S().tasks.find((t) => t.id === id)!.listId).toBe('inbox')
  })

  it('creates a kanban list with default columns', () => {
    const id = S().addList('Board', { kanban: true })
    const list = S().lists.find((l) => l.id === id)!
    expect(list.kanban).toBe(true)
    expect(list.columns.length).toBe(3)
  })

  it('deleting a folder detaches its lists', () => {
    const fid = S().addFolder('F')
    const lid = S().addList('L', { folderId: fid })
    S().deleteFolder(fid)
    expect(S().folders.length).toBe(0)
    expect(S().lists.find((l) => l.id === lid)!.folderId).toBeNull()
  })
})

describe('smart filters', () => {
  it('adds, updates and deletes filters', () => {
    const id = S().addFilter({ name: 'Urgent', priorities: [3] })
    expect(S().filters[0].name).toBe('Urgent')
    S().updateFilter(id, { name: 'Renamed' })
    expect(S().filters[0].name).toBe('Renamed')
    S().deleteFilter(id)
    expect(S().filters.length).toBe(0)
  })
})

describe('tags', () => {
  it('adds unique tags and strips leading #', () => {
    S().addTag('#focus')
    S().addTag('focus')
    expect(S().tags.filter((t) => t.name === 'focus').length).toBe(1)
  })
  it('deleting a tag removes it from tasks', () => {
    S().addTag('x')
    const id = S().addTask({ title: 't', listId: 'inbox', tags: ['x'] })
    S().deleteTag('x')
    expect(S().tags.length).toBe(0)
    expect(S().tasks.find((t) => t.id === id)!.tags).toEqual([])
  })
})

describe('habits', () => {
  it('creates a habit with default frequency', () => {
    S().addHabit({ name: 'Run' })
    const h = S().habits[0]
    expect(h.freq.type).toBe('daily')
    expect(h.goal).toBe(1)
  })
  it('increments and clamps habit log at zero', () => {
    S().addHabit({ name: 'Water', goal: 8 })
    const id = S().habits[0].id
    S().incrementHabit(id, '2026-06-01', 3)
    expect(S().habits[0].log['2026-06-01']).toBe(3)
    S().incrementHabit(id, '2026-06-01', -5)
    expect(S().habits[0].log['2026-06-01']).toBeUndefined()
  })
  it('toggleHabitDay fills to goal then clears', () => {
    S().addHabit({ name: 'Meditate', goal: 1 })
    const id = S().habits[0].id
    S().toggleHabitDay(id, '2026-06-01')
    expect(S().habits[0].log['2026-06-01']).toBe(1)
    S().toggleHabitDay(id, '2026-06-01')
    expect(S().habits[0].log['2026-06-01']).toBeUndefined()
  })
})

describe('data import/export & reset', () => {
  it('importData replaces the whole state', () => {
    S().importData({ tasks: [], lists: [inbox], folders: [], tags: [{ id: 'a', name: 'imported', color: '#000' }], filters: [], habits: [], pomodoros: [], settings })
    expect(S().tags[0].name).toBe('imported')
  })
  it('resetData repopulates seed content', () => {
    S().resetData()
    expect(S().tasks.length).toBeGreaterThan(0)
    expect(S().lists.find((l) => l.id === 'inbox')).toBeTruthy()
  })
})
