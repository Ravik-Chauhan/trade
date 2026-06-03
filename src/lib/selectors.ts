import type { Task, SortMode, GroupMode, SmartFilter, TaskList, Priority } from '../types'
import type { Selection } from '../store/useUI'
import { isDueToday, isDueTomorrow, isWithinNext7, isOverdue, relativeDays, todayISO } from './date'
import { dayProgress } from './tracking'
import { PRIORITY_META } from './utils'

export interface Bucket {
  key: string
  title: string
  tasks: Task[]
}

export function matchesFilter(task: Task, f: SmartFilter): boolean {
  if (task.kind === 'note') return false // custom smart lists are task-centric
  if (!f.includeCompleted && task.completed) return false
  if (f.listIds.length > 0 && !f.listIds.includes(task.listId)) return false
  if (f.priorities.length > 0 && !f.priorities.includes(task.priority)) return false
  if (f.tags.length > 0 && !f.tags.some((t) => task.tags.includes(t))) return false
  switch (f.due) {
    case 'today':
      if (!isDueToday(task.dueDate)) return false
      break
    case 'overdue':
      if (!(isOverdue(task.dueDate) && !task.completed)) return false
      break
    case 'next7':
      if (!isWithinNext7(task.dueDate)) return false
      break
    case 'nodate':
      if (task.dueDate) return false
      break
    default:
      break
  }
  return true
}

export function matchesSelection(task: Task, sel: Selection, filters: SmartFilter[] = []): boolean {
  switch (sel.kind) {
    case 'list':
      return task.listId === sel.id
    case 'tag':
      return task.tags.includes(sel.id)
    case 'filter': {
      const f = filters.find((x) => x.id === sel.id)
      return f ? matchesFilter(task, f) : false
    }
    case 'smart': {
      // Notes show in the Notes view and in their own list (Inbox is a list);
      // every other smart list is task-centric (dates, priority, completion).
      if (sel.id === 'notes') return task.kind === 'note'
      if (task.kind === 'note') return sel.id === 'inbox' && task.listId === 'inbox'
      switch (sel.id) {
        case 'today': {
          // a tracked task counts as "due today" only until all of today's
          // slots are logged, then it drops out of Today (and its count).
          if (task.trackingEnabled) {
            const { done, total } = dayProgress(task, todayISO())
            if (total === 0 || done < total) return true
          }
          return isDueToday(task.dueDate) || (isOverdue(task.dueDate) && !task.completed)
        }
        case 'tomorrow':
          return isDueTomorrow(task.dueDate)
        case 'next7':
          return isWithinNext7(task.dueDate) || (isOverdue(task.dueDate) && !task.completed)
        case 'inbox':
          return task.listId === 'inbox'
        case 'all':
          return true
        case 'completed':
          return task.completed
        case 'high':
          return task.priority === 3
        default:
          return false
      }
    }
    default:
      return false
  }
}

export function searchMatch(task: Task, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    task.title.toLowerCase().includes(q) ||
    task.notes.toLowerCase().includes(q) ||
    task.tags.some((t) => t.toLowerCase().includes(q)) ||
    task.subtasks.some((s) => s.title.toLowerCase().includes(q))
  )
}

export function sortTasks(tasks: Task[], sort: SortMode): Task[] {
  const arr = [...tasks]
  switch (sort) {
    case 'dueDate':
      return arr.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return a.order - b.order
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
    case 'priority':
      return arr.sort((a, b) => b.priority - a.priority || a.order - b.order)
    case 'title':
      return arr.sort((a, b) => a.title.localeCompare(b.title))
    case 'createdAt':
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    default:
      return arr.sort((a, b) => a.order - b.order)
  }
}

export function getVisibleTasks(
  tasks: Task[],
  sel: Selection,
  query: string,
  sort: SortMode,
  showCompleted: boolean,
  filters: SmartFilter[] = []
): Task[] {
  const isCompletedList = sel.kind === 'smart' && sel.id === 'completed'
  const filterObj = sel.kind === 'filter' ? filters.find((f) => f.id === sel.id) : null
  const filtered = tasks.filter((t) => {
    if (!matchesSelection(t, sel, filters)) return false
    if (!searchMatch(t, query)) return false
    if (isCompletedList) return t.completed
    // a custom filter that explicitly includes completed overrides the global toggle
    if (filterObj?.includeCompleted) return true
    if (t.completed && !showCompleted) return false
    return true
  })
  return sortTasks(filtered, sort)
}

export function countForSelection(tasks: Task[], sel: Selection, filters: SmartFilter[] = []): number {
  return tasks.filter((t) => !t.completed && matchesSelection(t, sel, filters)).length
}

/** Group a flat task array into labelled buckets for the list view. */
export function groupTasks(tasks: Task[], group: GroupMode, lists: TaskList[]): Bucket[] {
  if (group === 'none') return [{ key: 'all', title: '', tasks }]

  const buckets = new Map<string, Bucket>()
  const ensure = (key: string, title: string) => {
    if (!buckets.has(key)) buckets.set(key, { key, title, tasks: [] })
    return buckets.get(key)!
  }

  for (const t of tasks) {
    if (group === 'list') {
      const l = lists.find((x) => x.id === t.listId)
      ensure(t.listId, l ? `${l.emoji} ${l.name}` : 'Unknown').tasks.push(t)
    } else if (group === 'priority') {
      const meta = PRIORITY_META[t.priority]
      ensure(`p${t.priority}`, `${meta.label} Priority`).tasks.push(t)
    } else if (group === 'dueDate') {
      const { key, title } = dueBucket(t)
      ensure(key, title).tasks.push(t)
    } else if (group === 'tag') {
      if (t.tags.length === 0) ensure('none', 'No tag').tasks.push(t)
      else t.tags.forEach((tag) => ensure(tag, `#${tag}`).tasks.push(t))
    }
  }

  const order = group === 'priority' ? ['p3', 'p2', 'p1', 'p0'] : null
  const arr = Array.from(buckets.values())
  if (group === 'dueDate') {
    const rank: Record<string, number> = { overdue: 0, today: 1, tomorrow: 2, week: 3, later: 4, none: 5 }
    arr.sort((a, b) => (rank[a.key] ?? 9) - (rank[b.key] ?? 9))
  } else if (order) {
    arr.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
  }
  return arr
}

function dueBucket(t: Task): { key: string; title: string } {
  if (!t.dueDate) return { key: 'none', title: 'No date' }
  if (isOverdue(t.dueDate) && !t.completed) return { key: 'overdue', title: 'Overdue' }
  const diff = relativeDays(t.dueDate)
  if (diff === 0) return { key: 'today', title: 'Today' }
  if (diff === 1) return { key: 'tomorrow', title: 'Tomorrow' }
  if (diff !== null && diff <= 7) return { key: 'week', title: 'This week' }
  return { key: 'later', title: 'Later' }
}

/** Eisenhower matrix quadrant for a task (urgent = due within 2 days/overdue). */
export type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate'

export function quadrantFor(task: Task): Quadrant {
  const diff = relativeDays(task.dueDate)
  const urgent = task.dueDate !== null && diff !== null && diff <= 2
  const important = task.priority >= 2
  if (important && urgent) return 'do'
  if (important && !urgent) return 'schedule'
  if (!important && urgent) return 'delegate'
  return 'eliminate'
}

export const PRIORITIES: Priority[] = [0, 1, 2, 3]
