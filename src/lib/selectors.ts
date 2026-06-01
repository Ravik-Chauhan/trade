import type { Task, SortMode } from '../types'
import type { Selection } from '../store/useUI'
import { isDueToday, isDueTomorrow, isWithinNext7, isOverdue } from './date'

export interface Bucket {
  title: string
  tasks: Task[]
}

export function matchesSelection(task: Task, sel: Selection): boolean {
  switch (sel.kind) {
    case 'list':
      return task.listId === sel.id
    case 'tag':
      return task.tags.includes(sel.id)
    case 'smart':
      switch (sel.id) {
        case 'today':
          return isDueToday(task.dueDate) || (isOverdue(task.dueDate) && !task.completed)
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

/**
 * Filter + sort tasks for the current selection.
 * `showCompleted` controls whether completed tasks appear (except in the
 * Completed smart list where they are always shown).
 */
export function getVisibleTasks(
  tasks: Task[],
  sel: Selection,
  query: string,
  sort: SortMode,
  showCompleted: boolean
): Task[] {
  const isCompletedList = sel.kind === 'smart' && sel.id === 'completed'
  const filtered = tasks.filter((t) => {
    if (!matchesSelection(t, sel)) return false
    if (!searchMatch(t, query)) return false
    if (isCompletedList) return t.completed
    if (t.completed && !showCompleted) return false
    return true
  })
  return sortTasks(filtered, sort)
}

export function countForSelection(tasks: Task[], sel: Selection): number {
  return tasks.filter((t) => !t.completed && matchesSelection(t, sel)).length
}
