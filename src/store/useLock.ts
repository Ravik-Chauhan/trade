import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LockType = 'pin' | 'pattern'

interface LockStore {
  enabled: boolean
  type: LockType
  hash: string | null
  biometric: boolean // reserved for the biometric build
  lockOnResume: boolean
  locked: boolean // runtime only — not persisted
  setup: (type: LockType, hash: string, lockOnResume: boolean) => void
  disable: () => void
  setLockOnResume: (v: boolean) => void
  lock: () => void
  unlock: () => void
}

// Device-local (kept out of the synced app store, so a lock secret never leaves
// the device). Starts locked whenever a lock is configured.
export const useLock = create<LockStore>()(
  persist(
    (set) => ({
      enabled: false,
      type: 'pin',
      hash: null,
      biometric: false,
      lockOnResume: true,
      locked: false,
      setup: (type, hash, lockOnResume) => set({ enabled: true, type, hash, lockOnResume, locked: false }),
      disable: () => set({ enabled: false, hash: null, locked: false }),
      setLockOnResume: (lockOnResume) => set({ lockOnResume }),
      lock: () => set((s) => (s.enabled ? { locked: true } : s)),
      unlock: () => set({ locked: false }),
    }),
    {
      name: 'tickflow-lock',
      partialize: (s) => ({
        enabled: s.enabled,
        type: s.type,
        hash: s.hash,
        biometric: s.biometric,
        lockOnResume: s.lockOnResume,
      }),
      // start locked on launch when a lock is configured (sync hydration)
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) } as LockStore
        merged.locked = !!merged.enabled
        return merged
      },
    }
  )
)
