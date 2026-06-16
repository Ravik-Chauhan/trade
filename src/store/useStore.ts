import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  Task,
  TaskList,
  Folder,
  Habit,
  Settings,
  PomodoroSession,
  Priority,
  Subtask,
  SmartFilter,
} from '../types'
import { NO_RECURRENCE } from '../types'
import { uid } from '../lib/utils'
import { createSeedState } from '../lib/seed'
import { advanceRecurrence, dayKey } from '../lib/date'
import { toggleSlotLog, makeSlot } from '../lib/tracking'

interface Store extends AppState {
  // task actions
  addTask: (partial: Partial<Task> & { title: string; listId: string }) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  skipTask: (id: string) => void
  deleteTask: (id: string) => void
  duplicateTask: (id: string) => void
  moveTask: (id: string, listId: string, columnId?: string | null) => void
  reorderTask: (id: string, beforeId: string | null, listId?: string, columnId?: string | null) => void
  // subtasks
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subId: string) => void
  updateSubtask: (taskId: string, subId: string, title: string) => void
  deleteSubtask: (taskId: string, subId: string) => void
  // daily slot tracking
  setTracking: (taskId: string, enabled: boolean) => void
  setSlots: (taskId: string, slots: Task['slots']) => void
  toggleSlot: (taskId: string, dateKey: string, slotId: string) => void
  // lists & folders
  addList: (name: string, opts?: Partial<TaskList>) => string
  updateList: (id: string, patch: Partial<TaskList>) => void
  deleteList: (id: string) => void
  reorderLists: (ids: string[]) => void
  addFolder: (name: string) => string
  updateFolder: (id: string, patch: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  // tags
  addTag: (name: string, color?: string) => void
  deleteTag: (name: string) => void
  // smart filters (custom smart lists)
  addFilter: (f: Partial<SmartFilter> & { name: string }) => string
  updateFilter: (id: string, patch: Partial<SmartFilter>) => void
  deleteFilter: (id: string) => void
  // habits
  addHabit: (h: Partial<Habit> & { name: string }) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  toggleHabitDay: (id: string, date: string) => void
  incrementHabit: (id: string, date: string, delta: number) => void
  markHabitDone: (id: string, date: string) => void
  // pomodoro
  logPomodoro: (s: Omit<PomodoroSession, 'id'>) => void
  // settings & data
  updateSettings: (patch: Partial<Settings>) => void
  resetData: () => void
  importData: (data: AppState) => void
}

const PRIORITY_VALUES: Priority[] = [0, 1, 2, 3]
export const isPriority = (n: number): n is Priority => PRIORITY_VALUES.includes(n as Priority)

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeedState(),

      addTask: (partial) => {
        const id = uid('task')
        const maxOrder = Math.max(0, ...get().tasks.map((t) => t.order))
        const task: Task = {
          id,
          title: partial.title.trim(),
          notes: partial.notes ?? '',
          kind: partial.kind ?? 'task',
          listId: partial.listId,
          completed: false,
          completedAt: null,
          priority: partial.priority ?? 0,
          dueDate: partial.dueDate ?? null,
          startDate: partial.startDate ?? null,
          hasTime: partial.hasTime ?? false,
          tags: partial.tags ?? [],
          subtasks: partial.subtasks ?? [],
          recurrence: partial.recurrence ?? { ...NO_RECURRENCE },
          reminders: partial.reminders ?? [],
          countdown: partial.countdown ?? false,
          recurrenceLog: partial.recurrenceLog ?? [],
          hidePrivate: partial.hidePrivate ?? false,
          trackingEnabled: partial.trackingEnabled ?? false,
          slots: partial.slots ?? [],
          completionLog: partial.completionLog ?? {},
          pinned: partial.pinned ?? false,
          order: maxOrder + 1,
          createdAt: new Date().toISOString(),
          columnId: partial.columnId ?? null,
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return id
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      toggleTask: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return
        const completing = !task.completed
        // log the just-completed occurrence so the monthly view can show it done
        const logOccurrence = (log: string[]): string[] => {
          if (!completing || task.recurrence.rule === 'none' || !task.dueDate) return log
          const key = dayKey(task.dueDate)
          return log.includes(key) ? log : [...log, key]
        }
        // recurring: instead of completing, roll the due date forward (until the
        // series ends, at which point we fall through to a normal completion)
        if (completing && task.recurrence.rule !== 'none' && task.dueDate) {
          const { date, recurrence } = advanceRecurrence(task.dueDate, task.recurrence)
          if (date) {
            set((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      dueDate: date,
                      recurrence,
                      recurrenceLog: logOccurrence(t.recurrenceLog),
                      subtasks: t.subtasks.map((st) => ({ ...st, done: false })),
                    }
                  : t
              ),
            }))
            return
          }
        }
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: completing,
                  completedAt: completing ? new Date().toISOString() : null,
                  recurrenceLog: logOccurrence(t.recurrenceLog),
                  columnId: completing && t.columnId ? lastColumn(get().lists, t.listId) : t.columnId,
                }
              : t
          ),
        }))
      },

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      // Skip a recurring task's current occurrence: roll the due date forward
      // WITHOUT logging a completion. Ends the series like completion when it
      // runs out. No-op for non-recurring tasks.
      skipTask: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task || task.recurrence.rule === 'none' || !task.dueDate) return
        const { date, recurrence } = advanceRecurrence(task.dueDate, task.recurrence)
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? date
                ? { ...t, dueDate: date, recurrence, subtasks: t.subtasks.map((st) => ({ ...st, done: false })) }
                : { ...t, completed: true, completedAt: new Date().toISOString() }
              : t
          ),
        }))
      },

      // Mark a habit as fully done for a given day (used by notification action).
      markHabitDone: (id, date) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, log: { ...h.log, [date]: h.goal } } : h)),
        })),


      duplicateTask: (id) => {
        const t = get().tasks.find((x) => x.id === id)
        if (!t) return
        const maxOrder = Math.max(0, ...get().tasks.map((x) => x.order))
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              ...t,
              id: uid('task'),
              title: t.title + ' (copy)',
              completed: false,
              completedAt: null,
              order: maxOrder + 1,
              createdAt: new Date().toISOString(),
              subtasks: t.subtasks.map((st) => ({ ...st, id: uid('s') })),
            },
          ],
        }))
      },

      moveTask: (id, listId, columnId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, listId, columnId: columnId ?? null } : t
          ),
        })),

      reorderTask: (id, beforeId, listId, columnId) =>
        set((s) => {
          const tasks = [...s.tasks]
          const moving = tasks.find((t) => t.id === id)
          if (!moving) return {}
          if (listId !== undefined) moving.listId = listId
          if (columnId !== undefined) moving.columnId = columnId
          // recompute order by splicing visually
          const others = tasks.filter((t) => t.id !== id)
          const idx = beforeId ? others.findIndex((t) => t.id === beforeId) : others.length
          others.splice(idx === -1 ? others.length : idx, 0, moving)
          others.forEach((t, i) => (t.order = i))
          return { tasks: others }
        }),

      addSubtask: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: [...t.subtasks, { id: uid('s'), title: title.trim(), done: false }] }
              : t
          ),
        })),

      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((st) =>
                    st.id === subId ? { ...st, done: !st.done } : st
                  ),
                }
              : t
          ),
        })),

      updateSubtask: (taskId, subId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, title } : st)) }
              : t
          ),
        })),

      deleteSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subId) } : t
          ),
        })),

      setTracking: (taskId, enabled) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  trackingEnabled: enabled,
                  slots: enabled && t.slots.length === 0 ? [makeSlot('Done')] : t.slots,
                }
              : t
          ),
        })),

      setSlots: (taskId, slots) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, slots } : t)) })),

      toggleSlot: (taskId, dateKey, slotId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, completionLog: toggleSlotLog(t.completionLog, dateKey, slotId) } : t
          ),
        })),

      addList: (name, opts) => {
        const id = uid('list')
        const maxOrder = Math.max(0, ...get().lists.map((l) => l.order))
        const list: TaskList = {
          id,
          name: name.trim() || 'Untitled',
          color: opts?.color ?? '#4772fa',
          emoji: opts?.emoji ?? '📋',
          folderId: opts?.folderId ?? null,
          kanban: opts?.kanban ?? false,
          columns:
            opts?.columns ??
            (opts?.kanban
              ? [
                  { id: uid('col'), name: 'To Do' },
                  { id: uid('col'), name: 'In Progress' },
                  { id: uid('col'), name: 'Done' },
                ]
              : []),
          order: maxOrder + 1,
        }
        set((s) => ({ lists: [...s.lists, list] }))
        return id
      },

      updateList: (id, patch) =>
        set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

      deleteList: (id) =>
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== id),
          // move orphaned tasks to inbox
          tasks: s.tasks.map((t) => (t.listId === id ? { ...t, listId: 'inbox', columnId: null } : t)),
        })),

      reorderLists: (ids) =>
        set((s) => ({
          lists: s.lists.map((l) => ({ ...l, order: ids.indexOf(l.id) === -1 ? l.order : ids.indexOf(l.id) })),
        })),

      addFolder: (name) => {
        const id = uid('folder')
        const maxOrder = Math.max(0, ...get().folders.map((f) => f.order))
        set((s) => ({
          folders: [...s.folders, { id, name: name.trim() || 'Folder', order: maxOrder + 1, collapsed: false }],
        }))
        return id
      },

      updateFolder: (id, patch) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

      deleteFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          lists: s.lists.map((l) => (l.folderId === id ? { ...l, folderId: null } : l)),
        })),

      addTag: (name, color) =>
        set((s) => {
          const clean = name.trim().replace(/^#/, '')
          if (!clean || s.tags.some((t) => t.name === clean)) return {}
          return {
            tags: [...s.tags, { id: uid('tag'), name: clean, color: color ?? '#7a869a' }],
          }
        }),

      deleteTag: (name) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.name !== name),
          tasks: s.tasks.map((t) => ({ ...t, tags: t.tags.filter((x) => x !== name) })),
        })),

      addFilter: (f) => {
        const id = uid('flt')
        set((s) => ({
          filters: [
            ...s.filters,
            {
              id,
              name: f.name.trim() || 'Smart List',
              emoji: f.emoji ?? '🔎',
              color: f.color ?? '#4772fa',
              listIds: f.listIds ?? [],
              tags: f.tags ?? [],
              priorities: f.priorities ?? [],
              due: f.due ?? 'any',
              includeCompleted: f.includeCompleted ?? false,
            },
          ],
        }))
        return id
      },

      updateFilter: (id, patch) =>
        set((s) => ({ filters: s.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

      deleteFilter: (id) => set((s) => ({ filters: s.filters.filter((f) => f.id !== id) })),

      addHabit: (h) =>
        set((s) => ({
          habits: [
            ...s.habits,
            {
              id: uid('habit'),
              name: h.name.trim(),
              emoji: h.emoji ?? '🎯',
              color: h.color ?? '#4772fa',
              goal: h.goal ?? 1,
              unit: h.unit ?? 'time',
              freq: h.freq ?? { type: 'daily', days: [], timesPerWeek: 7 },
              reminderTime: h.reminderTime ?? null,
              archived: false,
              createdAt: new Date().toISOString(),
              log: {},
              hidePrivate: h.hidePrivate ?? false,
            },
          ],
        })),

      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),

      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      toggleHabitDay: (id, date) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h
            const log = { ...h.log }
            if (log[date] >= h.goal) delete log[date]
            else log[date] = h.goal
            return { ...h, log }
          }),
        })),

      incrementHabit: (id, date, delta) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h
            const log = { ...h.log }
            const next = Math.max(0, (log[date] ?? 0) + delta)
            if (next === 0) delete log[date]
            else log[date] = next
            return { ...h, log }
          }),
        })),

      logPomodoro: (sess) =>
        set((s) => ({ pomodoros: [...s.pomodoros, { ...sess, id: uid('pom') }] })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetData: () => set({ ...createSeedState() }),

      importData: (data) => set({ ...data }),
    }),
    {
      name: 'tickflow-store-v1',
      version: 5,
      // migrate older persisted shapes (single reminder / string repeat) forward
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (!state) return state as never
        if (version < 5) {
          const tasks = (state.tasks as Record<string, unknown>[] | undefined) ?? []
          state.tasks = tasks.map((t) => ({ hidePrivate: false, ...t }))
          const habits = (state.habits as Record<string, unknown>[] | undefined) ?? []
          state.habits = habits.map((h) => ({ hidePrivate: false, ...h }))
        }
        if (version < 4) {
          const tasks = (state.tasks as Record<string, unknown>[] | undefined) ?? []
          state.tasks = tasks.map((t) => ({ kind: 'task', ...t }))
        }
        if (version < 3) {
          const tasks = (state.tasks as Record<string, unknown>[] | undefined) ?? []
          state.tasks = tasks.map((t) => ({
            trackingEnabled: false,
            slots: [],
            completionLog: {},
            ...t,
          }))
        }
        if (version < 2) {
          const tasks = (state.tasks as Record<string, unknown>[] | undefined) ?? []
          state.tasks = tasks.map((t) => {
            const out = { ...t } as Record<string, unknown>
            if (!('reminders' in out)) out.reminders = out.reminder ? [out.reminder] : []
            delete out.reminder
            if (typeof out.recurrence === 'undefined') {
              const valid = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']
              const raw = out.repeat as string
              const rule = valid.includes(raw) ? raw : 'none'
              out.recurrence = { ...NO_RECURRENCE, rule }
            } else {
              // backfill custom-recurrence fields added in a later version
              out.recurrence = { ...NO_RECURRENCE, ...(out.recurrence as object) }
            }
            delete out.repeat
            if (typeof out.countdown === 'undefined') out.countdown = false
            if (!Array.isArray(out.recurrenceLog)) out.recurrenceLog = []
            return out
          })
          const habits = (state.habits as Record<string, unknown>[] | undefined) ?? []
          state.habits = habits.map((h) => {
            const out = { ...h } as Record<string, unknown>
            if (!out.freq) {
              out.freq = { type: 'daily', days: (out.days as number[]) ?? [], timesPerWeek: 7 }
            }
            delete out.days
            if (typeof out.reminderTime === 'undefined') out.reminderTime = null
            return out
          })
          const folders = (state.folders as Record<string, unknown>[] | undefined) ?? []
          state.folders = folders.map((f) => ({ collapsed: false, ...f }))
          if (!state.filters) state.filters = []
        }
        return state as never
      },
    }
  )
)

function lastColumn(lists: TaskList[], listId: string): string | null {
  const list = lists.find((l) => l.id === listId)
  if (!list || !list.kanban || list.columns.length === 0) return null
  return list.columns[list.columns.length - 1].id
}

// re-export helpers used by components
export { dayKey }
export type { Subtask }
