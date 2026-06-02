import { useEffect } from 'react'
import { X, Bell } from 'lucide-react'
import { useToasts } from '../store/useToasts'

export default function Toasts() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastCard key={t.id} id={t.id} title={t.title} body={t.body} emoji={t.emoji} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastCard({ title, body, emoji, onClose }: { id: string; title: string; body: string; emoji: string; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 8000)
    return () => window.clearTimeout(t)
  }, [onClose])

  return (
    <div className="toast">
      <div className="toast-icon"><Bell size={16} /></div>
      <div className="toast-body">
        <div className="toast-title">{emoji} {title}</div>
        <div className="toast-text">{body}</div>
      </div>
      <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={onClose} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}
