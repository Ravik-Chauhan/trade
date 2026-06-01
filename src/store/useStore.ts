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
  RepeatRule,
  Subtask,
} from '../types'
import { uid } from '../lib/utils'
import { createSeedState } from '../lib/seed'
import { nextOccurrence, dayKey } from '../lib/date'

interface Store extends AppState {
  // task actions
  addTask: (partial: Partial<Task> & { title: string; listId: string }) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  duplicateTask: (id: string) => void
  moveTask: (id: string, listId: string, columnId?: string | null) => void
  reorderTask: (id: string, beforeId: string | null, listId?: string, columnId?: string | null) => void
  // subtasks
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subId: string) => void
  updateSubtask: (taskId: string, subId: string, title: string) => void
  deleteSubtask: (taskId: string, subId: string) => void
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
  // habits
  addHabit: (h: Partial<Habit> & { name: string }) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  toggleHabitDay: (id: string, date: string) => void
  incrementHabit: (id: string, date: string, delta: number) => void
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
          listId: partial.listId,
          completed: false,
          completedAt: null,
          priority: partial.priority ?? 0,
          dueDate: partial.dueDate ?? null,
          startDate: partial.startDate ?? null,
          hasTime: partial.hasTime ?? false,
          tags: partial.tags ?? [],
          subtasks: partial.subtasks ?? [],
          repeat: partial.repeat ?? 'none',
          reminder: partial.reminder ?? null,
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
        // recurring: instead of completing, roll the due date forward
        if (completing && task.repeat !== 'none' && task.dueDate) {
          const next = nextOccurrence(task.dueDate, task.repeat as RepeatRule)
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? { ...t, dueDate: next, subtasks: t.subtasks.map((st) => ({ ...st, done: false })) }
                : t
            ),
          }))
          return
        }
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  completed: completing,
                  completedAt: completing ? new Date().toISOString() : null,
                  columnId: completing && t.columnId ? lastColumn(get().lists, t.listId) : t.columnId,
                }
              : t
          ),
        }))
      },

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

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
        set((s) => ({ folders: [...s.folders, { id, name: name.trim() || 'Folder', order: maxOrder + 1 }] }))
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
              days: h.days ?? [],
              archived: false,
              createdAt: new Date().toISOString(),
              log: {},
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
      version: 1,
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
