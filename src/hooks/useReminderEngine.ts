import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useToasts } from '../store/useToasts'
import { collectReminders, dueReminders } from '../lib/reminders'
import { showNotification, chime } from '../lib/notifications'

const FIRED_KEY = 'tickflow-fired-reminders'
const CHECK_MS = 15000

function loadFired(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function saveFired(s: Set<string>) {
  try {
    // keep it bounded
    localStorage.setItem(FIRED_KEY, JSON.stringify([...s].slice(-500)))
  } catch {
    /* ignore */
  }
}

/**
 * Polls every 15s while the app is open and fires reminders (browser
 * notification + sound + in-app toast) the moment their time elapses.
 * On first mount, reminders already in the past are marked fired silently so
 * the user isn't spammed with a backlog.
 */
export function useReminderEngine() {
  const push = useToasts((s) => s.push)
  const firedRef = useRef<Set<string>>(loadFired())
  const initialized = useRef(false)

  useEffect(() => {
    const fired = firedRef.current

    const tick = (silent: boolean) => {
      const { tasks, habits } = useStore.getState()
      const all = collectReminders(tasks, habits, new Date())
      const due = dueReminders(all, Date.now(), fired)
      for (const r of due) {
        fired.add(r.key)
        if (!silent) {
          const shown = showNotification(`${r.emoji} ${r.title}`, r.body)
          chime()
          // always show in-app toast too (covers denied/unsupported notifications)
          push({ title: r.title, body: r.body, emoji: r.emoji })
          void shown
        }
      }
      saveFired(fired)
    }

    // suppress backlog on first run
    if (!initialized.current) {
      tick(true)
      initialized.current = true
    }

    const interval = window.setInterval(() => tick(false), CHECK_MS)
    const onVisible = () => document.visibilityState === 'visible' && tick(false)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [push])
}
