import type { Task, Habit } from '../types'
import { format } from 'date-fns'

export interface ReminderInstance {
  key: string // stable unique id for this reminder firing
  time: number // epoch ms when it should fire
  title: string
  body: string
  emoji: string
}

function isRequiredToday(habit: Habit, date: Date): boolean {
  if (habit.freq.type === 'weekly') return true
  if (habit.freq.days.length === 0) return true
  return habit.freq.days.includes(date.getDay())
}

/**
 * Collect every reminder instance relevant around `now` (today), each with the
 * epoch time it should fire and a stable key. Pure + deterministic so it can be
 * unit-tested; the engine decides which have elapsed and which already fired.
 */
export function collectReminders(tasks: Task[], habits: Habit[], now: Date): ReminderInstance[] {
  const out: ReminderInstance[] = []
  const todayKey = format(now, 'yyyy-MM-dd')

  for (const t of tasks) {
    if (t.completed) continue
    for (const r of t.reminders) {
      const time = Date.parse(r)
      if (Number.isNaN(time)) continue
      out.push({
        key: `task:${t.id}:${r}`,
        time,
        title: t.title || 'Task',
        body: t.dueDate ? `Due ${t.dueDate.slice(0, 10)}` : 'Reminder',
        emoji: '✅',
      })
    }
    // tracked-task slot reminders (e.g. meds morning/evening)
    if (t.trackingEnabled) {
      const doneToday = new Set(t.completionLog[todayKey] ?? [])
      for (const slot of t.slots) {
        if (!slot.time || doneToday.has(slot.id)) continue
        const time = Date.parse(`${todayKey}T${slot.time}`)
        if (Number.isNaN(time)) continue
        out.push({
          key: `slot:${t.id}:${todayKey}:${slot.id}`,
          time,
          title: t.title || 'Task',
          body: `${slot.label} dose`,
          emoji: '💊',
        })
      }
    }
  }

  for (const h of habits) {
    if (h.archived || !h.reminderTime) continue
    if (!isRequiredToday(h, now)) continue
    if ((h.log[todayKey] ?? 0) >= h.goal) continue // already done today
    const time = Date.parse(`${todayKey}T${h.reminderTime}`)
    if (Number.isNaN(time)) continue
    out.push({
      key: `habit:${h.id}:${todayKey}`,
      time,
      title: h.name,
      body: `Time for your habit · goal ${h.goal} ${h.unit}`,
      emoji: h.emoji || '🎯',
    })
  }

  return out
}

/** Reminders whose time has elapsed (time <= now) and that have not fired yet. */
export function dueReminders(all: ReminderInstance[], now: number, fired: Set<string>): ReminderInstance[] {
  return all.filter((r) => r.time <= now && !fired.has(r.key))
}
