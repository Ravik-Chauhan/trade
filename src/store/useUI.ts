import { create } from 'zustand'
import type { SortMode, ViewMode, GroupMode } from '../types'

/** A selection is either a smart list, a real list, a tag, or a saved filter. */
export type Selection =
  | { kind: 'smart'; id: string }
  | { kind: 'list'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'filter'; id: string }
  | { kind: 'matrix' }
  | { kind: 'habits' }
  | { kind: 'focus' }
  | { kind: 'stats' }
  | { kind: 'settings' }

interface UIStore {
  selection: Selection
  selectedTaskId: string | null
  search: string
  sort: SortMode
  group: GroupMode
  view: ViewMode
  sidebarOpen: boolean
  setSelection: (s: Selection) => void
  selectTask: (id: string | null) => void
  setSearch: (q: string) => void
  setSort: (s: SortMode) => void
  setGroup: (g: GroupMode) => void
  setView: (v: ViewMode) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
}

export const useUI = create<UIStore>((set) => ({
  selection: { kind: 'smart', id: 'today' },
  selectedTaskId: null,
  search: '',
  sort: 'manual',
  group: 'none',
  view: 'list',
  sidebarOpen: false,
  setSelection: (s) => set({ selection: s, selectedTaskId: null, view: 'list' }),
  selectTask: (id) => set({ selectedTaskId: id }),
  setSearch: (q) => set({ search: q }),
  setSort: (s) => set({ sort: s }),
  setGroup: (g) => set({ group: g }),
  setView: (v) => set({ view: v }),
  toggleSidebar: () => set((st) => ({ sidebarOpen: !st.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
}))
