import { useEffect, useRef } from 'react'

// A LIFO stack of "dismiss" callbacks for transient UI (modals, menus, popovers).
// The Android back button/gesture runs the most-recently-opened one first, so a
// single hardware back closes the topmost overlay before navigating the app.
type BackFn = () => boolean // return true if this handler consumed the back press

const stack: BackFn[] = []

export function pushBack(fn: BackFn): () => void {
  stack.push(fn)
  return () => {
    const i = stack.lastIndexOf(fn)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** Run the topmost registered handler. Returns true if one consumed the press. */
export function runBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]()) return true
  }
  return false
}

/** Register `onDismiss` as the back action while `active` is true. */
export function useBackDismiss(active: boolean, onDismiss: () => void): void {
  const ref = useRef(onDismiss)
  ref.current = onDismiss
  useEffect(() => {
    if (!active) return
    return pushBack(() => {
      ref.current()
      return true
    })
  }, [active])
}
