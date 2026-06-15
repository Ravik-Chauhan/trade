// Native (Android) reminders via Capacitor LocalNotifications. Unlike web
// notifications — which only fire while a tab is open — these are scheduled on
// the device's alarm manager, so they fire even when TickFlow is closed.
// All entry points no-op on the web build (guarded by Capacitor.isNativePlatform).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { LocalNotificationSchema } from '@capacitor/local-notifications'
import type { Task, Habit } from '../types'
import { useStore } from '../store/useStore'
import { todayISO } from './date'
import { getSnoozes, setSnooze, snoozeKeyFor } from './snooze'

export type NativePerm = 'granted' | 'denied' | 'prompt'

export const isNative = (): boolean => Capacitor.isNativePlatform()

const TEST_ID = 2147483646
const MAX_SCHEDULED = 120 // 15-min re-arm series multiply the count; stay under OS limits
const CHANNEL_ID = 'reminders'
const SMALL_ICON = 'ic_stat_notify'
const PRIVATE_TITLE = 'TickFlow'
const PRIVATE_BODY = 'You have a new reminder'
const ACTION_TYPE = 'REMINDER'
const SNOOZE_MS = 60 * 60_000 // snooze quiets a reminder for 1 hour

type ReminderExtra = { kind: 'task' | 'slot' | 'habit'; id: string; slotId?: string }

let actionsReady = false
/** Register the Complete / Skip action buttons shown on reminder notifications. */
async function ensureActionTypes(): Promise<void> {
  if (!isNative() || actionsReady) return
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE,
          actions: [
            { id: 'complete', title: '✓ Complete' },
            { id: 'snooze', title: 'Snooze 1h' },
            { id: 'skip', title: 'Skip' },
          ],
        },
      ],
    })
    actionsReady = true
  } catch {
    /* best-effort */
  }
}

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
  const todayKey = todayISO()
  const snoozes = getSnoozes()
  const INTERVAL = 15 * 60_000 // re-remind every 15 minutes
  const NAG_WINDOW = 3 * 3600_000 // for up to 3 hours after the time
  const MAX_PER = 12 // cap nag copies per reminder

  const isActiveToday = (h: Habit) => {
    if (h.freq.type === 'weekly' || h.freq.days.length === 0) return true
    return h.freq.days.includes(new Date().getDay())
  }

  // Android 14+ lets users dismiss "ongoing" notifications, so we re-fire each
  // reminder every 15 min (only future slots, anchored to its time so a resync
  // recomputes the same times) — it reappears after "Clear all" until it's acted
  // on (which drops it on the next resync).
  const addNag = (keyBase: string, firstTs: number, title: string, body: string, extra: ReminderExtra) => {
    // honor a per-reminder snooze: don't re-fire until the snooze expires
    const until = snoozes[snoozeKeyFor(extra.kind, extra.id, extra.slotId)] || 0
    const start = Math.max(firstTs, until)
    let i = 0
    for (let ts = start; ts <= start + NAG_WINDOW && i < MAX_PER; ts += INTERVAL) {
      if (ts <= now + 1000) continue
      out.push({ id: hashId(`${keyBase}:${i}`), title, body, schedule: { at: new Date(ts), allowWhileIdle: true }, extra })
      i++
    }
  }

  for (const t of tasks) {
    if (t.completed) continue
    const title = t.hidePrivate ? PRIVATE_TITLE : t.title || 'Task'
    const body = t.hidePrivate ? PRIVATE_BODY : t.dueDate ? `Due ${t.dueDate.slice(0, 10)}` : 'Reminder'
    // explicit reminders: 15-min re-arm series starting at the reminder time
    for (const r of t.reminders) {
      const ts = Date.parse(r)
      if (Number.isNaN(ts) || ts < now - NAG_WINDOW) continue
      addNag(`task:${t.id}:${r}`, ts, title, body, { kind: 'task', id: t.id })
    }
    // tracked-task slots: a daily base alarm + today's 15-min re-arm (until done)
    if (t.trackingEnabled) {
      const doneSlots = new Set(t.completionLog[todayKey] ?? [])
      for (const slot of t.slots) {
        const hm = slot.time ? parseHM(slot.time) : null
        if (!hm) continue
        const sbody = t.hidePrivate ? PRIVATE_BODY : `${slot.label || 'Reminder'} · ${slot.time}`
        const extra: ReminderExtra = { kind: 'slot', id: t.id, slotId: slot.id }
        out.push({
          id: hashId(`slot:${t.id}:${slot.id}`),
          title,
          body: sbody,
          schedule: { on: { hour: hm.hour, minute: hm.minute }, allowWhileIdle: true },
          extra,
        })
        if (!doneSlots.has(slot.id)) {
          const baseToday = Date.parse(`${todayKey}T${slot.time}`)
          if (!Number.isNaN(baseToday)) addNag(`slotnag:${t.id}:${slot.id}`, baseToday + INTERVAL, title, sbody, extra)
        }
      }
    }
  }

  for (const h of habits) {
    if (h.archived || !h.reminderTime) continue
    const hm = parseHM(h.reminderTime)
    if (!hm) continue
    const title = h.hidePrivate ? PRIVATE_TITLE : `${h.emoji || '🎯'} ${h.name}`
    const body = h.hidePrivate ? PRIVATE_BODY : `Time for your habit · goal ${h.goal} ${h.unit}`.trim()
    const extra: ReminderExtra = { kind: 'habit', id: h.id }
    // daily base alarm(s) so it still fires when the app is never opened
    if (h.freq.type === 'daily' && h.freq.days.length > 0) {
      for (const wd of h.freq.days) {
        out.push({ id: hashId(`habit:${h.id}:${wd}`), title, body, schedule: { on: { weekday: wd + 1, hour: hm.hour, minute: hm.minute }, allowWhileIdle: true }, extra })
      }
    } else {
      out.push({ id: hashId(`habit:${h.id}`), title, body, schedule: { on: { hour: hm.hour, minute: hm.minute }, allowWhileIdle: true }, extra })
    }
    // today's 15-min re-arm (until the habit's goal is met today)
    const doneToday = (h.log[todayKey] ?? 0) >= h.goal
    if (!doneToday && isActiveToday(h)) {
      const baseToday = Date.parse(`${todayKey}T${h.reminderTime}`)
      if (!Number.isNaN(baseToday)) addNag(`habitnag:${h.id}`, baseToday + INTERVAL, title, body, extra)
    }
  }

  // sticky + actionable: ongoing + autoCancel off (best-effort on Android 14+),
  // with Complete / Skip actions; the 15-min re-arm guarantees reappearance.
  return out.slice(0, MAX_SCHEDULED).map((n) => ({
    ...n,
    channelId: CHANNEL_ID,
    smallIcon: SMALL_ICON,
    actionTypeId: ACTION_TYPE,
    ongoing: true,
    autoCancel: false,
  }))
}

/** Cancel everything we previously scheduled and reschedule from current state. */
export async function syncNativeReminders(tasks: Task[], habits: Habit[]): Promise<void> {
  if (!isNative()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    await ensureChannel()
    await ensureActionTypes()
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
/** Apply a Complete/Skip action tapped on a reminder notification. */
function applyAction(actionId: string, extra: ReminderExtra | undefined): void {
  if (!extra?.id) return
  const s = useStore.getState()
  const today = todayISO()
  if (actionId === 'complete') {
    if (extra.kind === 'task') s.toggleTask(extra.id)
    else if (extra.kind === 'slot' && extra.slotId) s.toggleSlot(extra.id, today, extra.slotId)
    else if (extra.kind === 'habit') s.markHabitDone(extra.id, today)
  } else if (actionId === 'skip') {
    if (extra.kind === 'task') s.skipTask(extra.id)
    // slot/habit "skip" just dismisses the notification — no data change
  } else if (actionId === 'snooze') {
    setSnooze(snoozeKeyFor(extra.kind, extra.id, extra.slotId), Date.now() + SNOOZE_MS)
  }
}

/**
 * Listen for taps on the Complete/Skip buttons. Applies the action, dismisses
 * that notification, and reschedules. Returns a cleanup function.
 */
export function initNotificationActions(): () => void {
  if (!isNative()) return () => {}
  void ensureActionTypes()
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
    const actionId = event.actionId
    if (actionId !== 'complete' && actionId !== 'skip' && actionId !== 'snooze') return // 'tap' just opens the app
    applyAction(actionId, event.notification.extra as ReminderExtra | undefined)
    try {
      await LocalNotifications.cancel({ notifications: [{ id: event.notification.id }] })
    } catch {
      /* ignore */
    }
    const s = useStore.getState()
    void syncNativeReminders(s.tasks, s.habits)
  })
  return () => void handle.then((h) => h.remove())
}

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
