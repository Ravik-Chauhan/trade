import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { isNative } from '../lib/nativeNotifications'
import { useUI } from '../store/useUI'
import { useLock } from '../store/useLock'
import { runBack } from '../lib/backHandler'

// Wire the Android hardware/gesture back so it walks the app's state-based
// navigation instead of immediately exiting. Registering any backButton
// listener disables Capacitor's default exit, so we must call exitApp ourselves
// once there is nothing left to go back to.
export function useBackButton(): void {
  useEffect(() => {
    if (!isNative()) return
    const handle = CapApp.addListener('backButton', () => {
      // While the lock screen is up, never navigate the app behind it.
      if (useLock.getState().locked) {
        CapApp.exitApp()
        return
      }
      // 1. Close the topmost overlay (modal, menu, popover) if one is open.
      if (runBack()) return

      const ui = useUI.getState()
      // 2. Close the mobile sidebar drawer.
      if (ui.sidebarOpen) {
        ui.setSidebar(false)
        return
      }
      // 3. Close an open task detail.
      if (ui.selectedTaskId) {
        ui.selectTask(null)
        return
      }
      // 4. From any non-list view, drop back to a list view first.
      if (ui.view !== 'list') {
        ui.setView('list')
        return
      }
      // 5. From any non-home section, return to Today.
      if (!(ui.selection.kind === 'smart' && ui.selection.id === 'today')) {
        ui.setSelection({ kind: 'smart', id: 'today' })
        return
      }
      // 6. Already home — let the OS background the app.
      CapApp.exitApp()
    })
    return () => {
      handle.then((h) => h.remove())
    }
  }, [])
}
