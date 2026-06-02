import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  body: string
  emoji: string
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: Math.random().toString(36).slice(2) }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
