import { useEffect, useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { useLock, type LockType } from '../store/useLock'
import { hashSecret } from '../lib/lock'
import { cx } from '../lib/utils'

/** Numeric PIN pad. Calls onComplete with the entered digits on ✓. */
function PinInput({ onComplete, error }: { onComplete: (secret: string) => void; error?: boolean }) {
  const [val, setVal] = useState('')
  useEffect(() => {
    if (error) setVal('')
  }, [error])
  const press = (d: string) => setVal((v) => (v.length < 12 ? v + d : v))
  const submit = () => {
    if (val.length >= 4) {
      onComplete(val)
      setVal('')
    }
  }
  return (
    <div className="lock-pin">
      <div className={cx('lock-dots', error && 'shake')}>
        {Array.from({ length: Math.max(4, val.length) }).map((_, i) => (
          <span key={i} className={cx('lock-dot', i < val.length && 'filled')} />
        ))}
      </div>
      <div className="lock-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="lock-key" onClick={() => press(String(n))}>{n}</button>
        ))}
        <button className="lock-key ghost" onClick={() => setVal((v) => v.slice(0, -1))} aria-label="Backspace">
          <Delete size={20} />
        </button>
        <button className="lock-key" onClick={() => press('0')}>0</button>
        <button className="lock-key go" onClick={submit} disabled={val.length < 4} aria-label="Confirm">✓</button>
      </div>
    </div>
  )
}

/** 3×3 pattern grid; drag across dots, releases to submit "0-1-4-…". */
function PatternInput({ onComplete, error }: { onComplete: (secret: string) => void; error?: boolean }) {
  const [sel, setSel] = useState<number[]>([])
  const selRef = useRef<number[]>([])
  const drawing = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) {
      setSel([])
      selRef.current = []
    }
  }, [error])
  const set = (next: number[]) => {
    selRef.current = next
    setSel(next)
  }
  const addAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const a = el?.getAttribute?.('data-node')
    if (a == null) return
    const idx = Number(a)
    if (!selRef.current.includes(idx)) set([...selRef.current, idx])
  }
  const down = (e: React.PointerEvent) => {
    drawing.current = true
    set([])
    try { gridRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    addAt(e.clientX, e.clientY)
  }
  const move = (e: React.PointerEvent) => {
    if (drawing.current) addAt(e.clientX, e.clientY)
  }
  const finish = () => {
    if (!drawing.current) return
    drawing.current = false
    const s = selRef.current
    if (s.length >= 1) onComplete(s.join('-'))
  }
  return (
    <div
      ref={gridRef}
      className={cx('lock-pattern', error && 'shake')}
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} data-node={i} className={cx('lock-node', sel.includes(i) && 'on')}>
          <span className="lock-node-dot" />
        </div>
      ))}
    </div>
  )
}

export function LockInput({ type, onComplete, error }: { type: LockType; onComplete: (secret: string) => void; error?: boolean }) {
  return type === 'pin' ? <PinInput onComplete={onComplete} error={error} /> : <PatternInput onComplete={onComplete} error={error} />
}

/** Full-screen overlay shown whenever the app is locked. */
export default function LockScreen() {
  const enabled = useLock((s) => s.enabled)
  const locked = useLock((s) => s.locked)
  const type = useLock((s) => s.type)
  const hash = useLock((s) => s.hash)
  const unlock = useLock((s) => s.unlock)
  const [error, setError] = useState(false)

  if (!enabled || !locked) return null

  const onComplete = async (secret: string) => {
    const h = await hashSecret(secret)
    if (h === hash) {
      setError(false)
      unlock()
    } else {
      setError(true)
      window.setTimeout(() => setError(false), 650)
    }
  }

  return (
    <div className="lock-overlay">
      <div className="lock-card">
        <div className="lock-logo">🔒</div>
        <div className="lock-title">TickFlow is locked</div>
        <div className="lock-sub">
          {error ? `Wrong ${type === 'pin' ? 'PIN' : 'pattern'} — try again` : `Enter your ${type === 'pin' ? 'PIN' : 'pattern'} to unlock`}
        </div>
        <LockInput type={type} onComplete={onComplete} error={error} />
      </div>
    </div>
  )
}
