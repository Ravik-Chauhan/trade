// Device-local snooze map: notification key -> epoch ms to stay quiet until.
// Kept out of synced data (snoozing is per-device and short-lived).
const KEY = 'tickflow-snooze'

export type SnoozeKind = 'task' | 'slot' | 'habit'

export function snoozeKeyFor(kind: SnoozeKind, id: string, slotId?: string): string {
  return kind === 'slot' ? `slot:${id}:${slotId}` : `${kind}:${id}`
}

export function getSnoozes(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number>
    const now = Date.now()
    let changed = false
    for (const k of Object.keys(raw)) {
      if (raw[k] <= now) {
        delete raw[k]
        changed = true
      }
    }
    if (changed) localStorage.setItem(KEY, JSON.stringify(raw))
    return raw
  } catch {
    return {}
  }
}

export function setSnooze(key: string, until: number): void {
  try {
    const m = getSnoozes()
    m[key] = until
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}
