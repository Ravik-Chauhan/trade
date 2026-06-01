import { create } from 'zustand'
import type { SortMode, ViewMode } from '../types'

/** A selection is either a smart list, a real list, or a tag filter. */
export type Selection =
  | { kind: 'smart'; id: string }
  | { kind: 'list'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'habits' }
  | { kind: 'focus' }
  | { kind: 'stats' }
  | { kind: 'settings' }

interface UIStore {
  selection: Selection
  selectedTaskId: string | null
  search: string
  sort: SortMode
  view: ViewMode
  sidebarOpen: boolean
  setSelection: (s: Selection) => void
  selectTask: (id: string | null) => void
  setSearch: (q: string) => void
  setSort: (s: SortMode) => void
  setView: (v: ViewMode) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
}

export const useUI = create<UIStore>((set) => ({
  selection: { kind: 'smart', id: 'today' },
  selectedTaskId: null,
  search: '',
  sort: 'manual',
  view: 'list',
  sidebarOpen: false,
  setSelection: (s) => set({ selection: s, selectedTaskId: null, view: 'list' }),
  selectTask: (id) => set({ selectedTaskId: id }),
  setSearch: (q) => set({ search: q }),
  setSort: (s) => set({ sort: s }),
  setView: (v) => set({ view: v }),
  toggleSidebar: () => set((st) => ({ sidebarOpen: !st.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
}))
