import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useLock } from '../store/useLock'
import { isNative } from '../lib/nativeNotifications'

/**
 * Re-locks the app when it goes to the background (if lock-on-resume is on), so
 * returning to it — including via a reminder tap — requires the PIN/pattern.
 * The initial launch lock is set when the lock store hydrates.
 */
export function useAppLock() {
  useEffect(() => {
    const lockNow = () => {
      const st = useLock.getState()
      if (st.enabled && st.lockOnResume) st.lock()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') lockNow()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const pause = isNative() ? CapApp.addListener('pause', lockNow) : null

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void pause?.then((h) => h.remove())
    }
  }, [])
}
