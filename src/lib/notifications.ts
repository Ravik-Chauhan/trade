/** Browser notification + sound helpers (best-effort; degrade gracefully). */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied'
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function showNotification(title: string, body: string): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    const n = new Notification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' })
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return true
  } catch {
    return false
  }
}

let audioCtx: AudioContext | null = null

export function chime() {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const ctx = audioCtx
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    ;[880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      const start = now + i * 0.18
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
      osc.start(start)
      osc.stop(start + 0.42)
    })
  } catch {
    /* ignore */
  }
}
