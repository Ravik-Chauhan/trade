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

function showViaConstructor(title: string, options: NotificationOptions): boolean {
  try {
    const n = new Notification(title, options)
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return true
  } catch {
    return false
  }
}

export function showNotification(title: string, body: string): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const options: NotificationOptions = { body, icon: '/favicon.svg', badge: '/favicon.svg', requireInteraction: true }
  // Android Chrome forbids `new Notification()` and only allows notifications
  // raised from a service worker (registration.showNotification). Prefer the SW
  // when one is registered; fall back to the page-level constructor on desktop.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) reg.showNotification(title, options).catch(() => showViaConstructor(title, options))
        else showViaConstructor(title, options)
      })
      .catch(() => showViaConstructor(title, options))
    return true
  }
  return showViaConstructor(title, options)
}

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return audioCtx
  } catch {
    return null
  }
}

/** Resume the audio context. Call from a user gesture to unlock playback. */
export function ensureAudioReady() {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/**
 * Browsers block WebAudio until the user interacts with the page. Install
 * one-time listeners so the audio context is unlocked on the first gesture —
 * that way an auto-fired reminder (from the polling timer) can still chime.
 */
export function installAudioUnlock() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    ensureAudioReady()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock)
}

export function chime() {
  const ctx = getCtx()
  if (!ctx) return
  const play = () => {
    try {
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
  if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {})
  else play()
}
