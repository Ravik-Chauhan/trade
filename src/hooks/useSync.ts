import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useSyncStatus } from '../store/useSyncStatus'
import { snapshot, localVersion, setLocalVersion, fetchServer, pushServer } from '../lib/sync'

const POLL_MS = 5000
const PUSH_DEBOUNCE_MS = 1200

/**
 * Two-way sync with the local sync server (server mode only). When the app is
 * served by `node server/index.mjs`, /api/state exists and this keeps every
 * device on the network in sync (last-write-wins). Under `npm run dev` there is
 * no /api, so fetch fails and sync stays 'disabled' — dev mode is unaffected.
 */
export function useSync() {
  const importData = useStore((s) => s.importData)
  const setStatus = useSyncStatus((s) => s.setStatus)
  const skipPush = useRef(false)
  const enabled = useRef(false)

  useEffect(() => {
    let stopped = false
    let pushTimer: number | undefined

    const applyRemote = (state: NonNullable<Awaited<ReturnType<typeof fetchServer>>>['state'], version: number) => {
      if (!state) return
      skipPush.current = true // importData will trigger subscribe; don't echo it back
      importData(state)
      setLocalVersion(version)
    }

    const pull = async () => {
      const res = await fetchServer()
      if (!res) {
        if (enabled.current || useSyncStatus.getState().status !== 'disabled') setStatus('offline')
        enabled.current = false
        return
      }
      enabled.current = true
      if (res.state && res.version > localVersion()) {
        applyRemote(res.state, res.version) // server is newer -> adopt it
      } else if (!res.state || res.version === 0) {
        // server is empty -> seed it from this device's data
        const v = await pushServer(snapshot())
        if (v != null) setLocalVersion(v)
      }
      setStatus('synced')
    }

    pull()

    const unsub = useStore.subscribe(() => {
      if (!enabled.current) return
      if (skipPush.current) { skipPush.current = false; return }
      window.clearTimeout(pushTimer)
      setStatus('syncing')
      pushTimer = window.setTimeout(async () => {
        const v = await pushServer(snapshot())
        if (v != null) { setLocalVersion(v); setStatus('synced') }
        else setStatus('offline')
      }, PUSH_DEBOUNCE_MS)
    })

    const poll = window.setInterval(() => { if (!stopped) pull() }, POLL_MS)
    const onVis = () => document.visibilityState === 'visible' && pull()
    document.addEventListener('visibilitychange', onVis)

    return () => {
      stopped = true
      unsub()
      window.clearInterval(poll)
      window.clearTimeout(pushTimer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [importData, setStatus])
}
