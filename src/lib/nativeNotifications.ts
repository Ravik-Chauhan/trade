// Native (Android) reminders via Capacitor LocalNotifications. Unlike web
// notifications — which only fire while a tab is open — these are scheduled on
// the device's alarm manager, so they fire even when TickFlow is closed.
// All entry points no-op on the web build (guarded by Capacitor.isNativePlatform).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { LocalNotificationSchema } from '@capacitor/local-notifications'
import type { Task, Habit } from '../types'

export type NativePerm = 'granted' | 'denied' | 'prompt'

export const isNative = (): boolean => Capacitor.isNativePlatform()

const TEST_ID = 2147483646
const MAX_SCHEDULED = 60 // keep well under Android's alarm limits
const CHANNEL_ID = 'reminders'
const SMALL_ICON = 'ic_stat_notify'

let channelReady = false
/** Create a high-importance channel so reminders show as heads-up + sound. */
async function ensureChannel(): Promise<void> {
  if (!isNative() || channelReady) return
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Reminders',
      description: 'Task and habit reminders',
      importance: 5, // MAX -> heads-up
      visibility: 1, // public on lock screen
      vibration: true,
      lights: true,
    })
    channelReady = true
  } catch {
    /* channels are Android-only / best-effort */
  }
}

/** Stable positive 31-bit id derived from a reminder key. */
function hashId(key: string): number {
  let h = 5381
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0
  return (Math.abs(h) % 2147483645) + 1
}

function parseHM(t: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t)
  if (!m) return null
  return { hour: Number(m[1]), minute: Number(m[2]) }
}

export async function getNativePermission(): Promise<NativePerm> {
  if (!isNative()) return 'denied'
  try {
    const res = await LocalNotifications.checkPermissions()
    return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'prompt'
  }
}

export async function requestNativePermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const res = await LocalNotifications.requestPermissions()
    return res.display === 'granted'
  } catch {
    return false
  }
}

/** Build the set of notifications to schedule from the current tasks + habits. */
function buildNotifications(tasks: Task[], habits: Habit[]): LocalNotificationSchema[] {
  const out: LocalNotificationSchema[] = []
  const now = Date.now()

  for (const t of tasks) {
    if (t.completed) continue
    // explicit one-off reminders (future only)
    for (const r of t.reminders) {
      const ts = Date.parse(r)
      if (Number.isNaN(ts) || ts <= now + 1000) continue
      out.push({
        id: hashId(`task:${t.id}:${r}`),
        title: t.title || 'Task',
        body: t.dueDate ? `Due ${t.dueDate.slice(0, 10)}` : 'Reminder',
        schedule: { at: new Date(ts), allowWhileIdle: true },
      })
    }
    // tracked-task slots -> a daily reminder at each slot time
    if (t.trackingEnabled) {
      for (const slot of t.slots) {
        const hm = slot.time ? parseHM(slot.time) : null
        if (!hm) continue
        out.push({
          id: hashId(`slot:${t.id}:${slot.id}`),
          title: t.title || 'Task',
          body: `${slot.label || 'Reminder'} · ${slot.time}`,
          schedule: { on: { hour: hm.hour, minute: hm.minute }, allowWhileIdle: true },
        })
      }
    }
  }

  for (const h of habits) {
    if (h.archived || !h.reminderTime) continue
    const hm = parseHM(h.reminderTime)
    if (!hm) continue
    const title = `${h.emoji || '🎯'} ${h.name}`
    const body = `Time for your habit · goal ${h.goal} ${h.unit}`.trim()
    if (h.freq.type === 'daily' && h.freq.days.length > 0) {
      // specific weekdays -> one weekly schedule each (Capacitor weekday: 1=Sun..7=Sat)
      for (const wd of h.freq.days) {
        out.push({
          id: hashId(`habit:${h.id}:${wd}`),
          title,
          body,
          schedule: { on: { weekday: wd + 1, hour: hm.hour, minute: hm.minute }, allowWhileIdle: true },
        })
      }
    } else {
      out.push({
        id: hashId(`habit:${h.id}`),
        title,
        body,
        schedule: { on: { hour: hm.hour, minute: hm.minute }, allowWhileIdle: true },
      })
    }
  }

  return out.slice(0, MAX_SCHEDULED).map((n) => ({ ...n, channelId: CHANNEL_ID, smallIcon: SMALL_ICON }))
}

/** Cancel everything we previously scheduled and reschedule from current state. */
export async function syncNativeReminders(tasks: Task[], habits: Habit[]): Promise<void> {
  if (!isNative()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    await ensureChannel()
    const pending = await LocalNotifications.getPending()
    const toCancel = pending.notifications.filter((n) => n.id !== TEST_ID)
    if (toCancel.length) await LocalNotifications.cancel({ notifications: toCancel.map((n) => ({ id: n.id })) })
    const notes = buildNotifications(tasks, habits)
    if (notes.length) await LocalNotifications.schedule({ notifications: notes })
  } catch {
    /* best-effort */
  }
}

/**
 * Fire an immediate native notification so the user can confirm it works.
 * Returns an error string on failure (e.g. permission off), or null on success.
 */
export async function sendNativeTest(): Promise<string | null> {
  if (!isNative()) return 'not a native app'
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return 'notifications are not permitted'
    await ensureChannel()
    // no `schedule` -> shown immediately
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_ID,
          title: '✅ Test reminder',
          body: 'This is what a reminder looks like.',
          channelId: CHANNEL_ID,
          smallIcon: SMALL_ICON,
        },
      ],
    })
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'could not post notification'
  }
}
