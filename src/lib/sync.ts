import { useStore } from '../store/useStore'
import type { AppState } from '../types'

const API = '/api/state'
const VKEY = 'tickflow-sync-version'

/** Build an AppState snapshot from the live store. */
export function snapshot(): AppState {
  const s = useStore.getState()
  return {
    tasks: s.tasks,
    lists: s.lists,
    folders: s.folders,
    tags: s.tags,
    filters: s.filters,
    habits: s.habits,
    pomodoros: s.pomodoros,
    settings: s.settings,
  }
}

export function localVersion(): number {
  return Number(localStorage.getItem(VKEY) || '0')
}
export function setLocalVersion(v: number) {
  localStorage.setItem(VKEY, String(v))
}

export interface ServerState {
  version: number
  state: AppState | null
}

export async function fetchServer(): Promise<ServerState | null> {
  try {
    const r = await fetch(API, { cache: 'no-store' })
    if (!r.ok) return null
    return (await r.json()) as ServerState
  } catch {
    return null // no server (e.g. running under `npm run dev`) -> sync disabled
  }
}

export async function pushServer(state: AppState): Promise<number | null> {
  try {
    const r = await fetch(API, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state }),
    })
    if (!r.ok) return null
    const j = (await r.json()) as { version: number }
    return j.version
  } catch {
    return null
  }
}
