import type { Task, TrackingSlot } from '../types'
import { uid } from './utils'

export const DEFAULT_SLOT_LABEL = 'Done'

export const SLOT_PRESETS: { label: string; slots: { label: string; time: string | null }[] }[] = [
  { label: 'Once a day', slots: [{ label: 'Done', time: null }] },
  { label: 'Morning & Evening', slots: [{ label: 'Morning', time: '08:00' }, { label: 'Evening', time: '20:00' }] },
  { label: 'Morning · Noon · Evening', slots: [{ label: 'Morning', time: '08:00' }, { label: 'Noon', time: '13:00' }, { label: 'Evening', time: '20:00' }] },
]

export function makeSlot(label: string, time: string | null = null): TrackingSlot {
  return { id: uid('slot'), label, time }
}

/** Was a given slot completed on a given day? */
export function slotDone(task: Task, dateKey: string, slotId: string): boolean {
  return (task.completionLog[dateKey] ?? []).includes(slotId)
}

/** Toggle a slot's completion on a date, returning a NEW log object. */
export function toggleSlotLog(
  log: { [date: string]: string[] },
  dateKey: string,
  slotId: string
): { [date: string]: string[] } {
  const day = log[dateKey] ?? []
  const has = day.includes(slotId)
  const nextDay = has ? day.filter((s) => s !== slotId) : [...day, slotId]
  const next = { ...log }
  if (nextDay.length === 0) delete next[dateKey]
  else next[dateKey] = nextDay
  return next
}

/** How many of today's slots are done. */
export function dayProgress(task: Task, dateKey: string): { done: number; total: number } {
  const total = task.slots.length
  const doneIds = new Set(task.completionLog[dateKey] ?? [])
  const done = task.slots.filter((s) => doneIds.has(s.id)).length
  return { done, total }
}

/** Consecutive days (ending today) where ALL slots were completed. */
export function trackingStreak(task: Task, todayKey: string, dayBefore: (key: string, n: number) => string): number {
  if (task.slots.length === 0) return 0
  let count = 0
  for (let i = 0; i < 366; i++) {
    const key = dayBefore(todayKey, i)
    const doneIds = new Set(task.completionLog[key] ?? [])
    const allDone = task.slots.every((s) => doneIds.has(s.id))
    if (allDone) count++
    else if (i === 0) continue // today not finished yet shouldn't break the streak
    else break
  }
  return count
}
