import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useStore } from '../store/useStore'
import { isNative, syncNativeReminders, initNotificationActions } from '../lib/nativeNotifications'

/**
 * On Android, keep device-scheduled reminders in sync with the store so they
 * fire even when the app is closed. Re-syncs (debounced) whenever tasks or
 * habits change, and again whenever the app returns to the foreground. No-op
 * on the web build.
 */
export function useNativeNotifications() {
  useEffect(() => {
    if (!isNative()) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const sync = () => {
      const { tasks, habits } = useStore.getState()
      void syncNativeReminders(tasks, habits)
    }
    const debouncedSync = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(sync, 800)
    }

    sync() // initial
    const removeActions = initNotificationActions()

    let prevTasks = useStore.getState().tasks
    let prevHabits = useStore.getState().habits
    const unsub = useStore.subscribe((state) => {
      if (state.tasks !== prevTasks || state.habits !== prevHabits) {
        prevTasks = state.tasks
        prevHabits = state.habits
        debouncedSync()
      }
    })

    const resumeHandle = CapApp.addListener('resume', sync)

    return () => {
      if (timer) clearTimeout(timer)
      unsub()
      removeActions()
      void resumeHandle.then((h) => h.remove())
    }
  }, [])
}
