import type { Task } from '../types'
import { format, parseISO } from 'date-fns'
import { isPastDue, isTimePast } from './date'

/** A single thing to show on the calendar — a scheduled task or a tracking slot. */
export interface CalItem {
  key: string
  taskId: string
  slotId?: string
  title: string
  time: string | null // 'HH:mm'
  priority: number
  completed: boolean
  tracking: boolean
  overdue: boolean
}

const dueDay = (d: string) => format(parseISO(d), 'yyyy-MM-dd')

function byTime(a: CalItem, b: CalItem): number {
  if (a.time && b.time) return a.time.localeCompare(b.time)
  if (a.time) return -1 // timed before untimed
  if (b.time) return 1
  return 0
}

/**
 * Everything that belongs on a given calendar day: tasks whose due date is that
 * day, plus every daily-tracking task's slots for that day (tracking tasks
 * recur every day, so they appear on each day at their slot times).
 */
export function itemsForDay(tasks: Task[], dayKey: string): CalItem[] {
  const items: CalItem[] = []
  for (const t of tasks) {
    if (t.kind === 'note') continue
    if (t.trackingEnabled) {
      const done = new Set(t.completionLog[dayKey] ?? [])
      if (t.slots.length === 0) {
        items.push({ key: `${t.id}:track`, taskId: t.id, title: t.title, time: null, priority: t.priority, completed: false, tracking: true, overdue: false })
      } else {
        for (const s of t.slots) {
          const isDone = done.has(s.id)
          items.push({
            key: `${t.id}:${s.id}`,
            taskId: t.id,
            slotId: s.id,
            title: s.label ? `${t.title} · ${s.label}` : t.title,
            time: s.time ?? null,
            priority: t.priority,
            completed: isDone,
            tracking: true,
            overdue: !isDone && isTimePast(dayKey, s.time),
          })
        }
      }
    } else if (t.dueDate && dueDay(t.dueDate) === dayKey) {
      items.push({
        key: t.id,
        taskId: t.id,
        title: t.title,
        time: t.hasTime ? format(parseISO(t.dueDate), 'HH:mm') : null,
        priority: t.priority,
        completed: t.completed,
        tracking: false,
        overdue: !t.completed && isPastDue(t.dueDate, t.hasTime),
      })
    }
  }
  return items.sort(byTime)
}

/** Incomplete, due-dated tasks whose due date is before today (carried-forward). */
export function overdueItems(tasks: Task[], todayKey: string): CalItem[] {
  return tasks
    .filter((t) => t.kind !== 'note' && !t.trackingEnabled && !t.completed && !!t.dueDate && dueDay(t.dueDate) < todayKey)
    .map((t) => ({
      key: t.id,
      taskId: t.id,
      title: t.title,
      time: t.hasTime ? format(parseISO(t.dueDate!), 'HH:mm') : null,
      priority: t.priority,
      completed: false,
      tracking: false,
      overdue: true,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}
