import { create } from 'zustand'

export type SyncStatus = 'disabled' | 'offline' | 'syncing' | 'synced'

interface SyncStatusState {
  status: SyncStatus
  lastSync: number | null
  setStatus: (s: SyncStatus) => void
}

/** Tiny store so the UI (Settings) can show live sync state. */
export const useSyncStatus = create<SyncStatusState>((set) => ({
  status: 'disabled',
  lastSync: null,
  setStatus: (status) =>
    set((st) => ({ status, lastSync: status === 'synced' ? Date.now() : st.lastSync })),
}))
