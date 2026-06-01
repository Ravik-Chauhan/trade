import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { quadrantFor, type Quadrant } from '../lib/selectors'
import { cx } from '../lib/utils'
import { Check } from 'lucide-react'
import { formatDue } from '../lib/date'

const QUADRANTS: { id: Quadrant; title: string; hint: string; color: string }[] = [
  { id: 'do', title: 'Do First', hint: 'Urgent & Important', color: '#e0392f' },
  { id: 'schedule', title: 'Schedule', hint: 'Important, Not Urgent', color: '#4772fa' },
  { id: 'delegate', title: 'Delegate', hint: 'Urgent, Not Important', color: '#f5a623' },
  { id: 'eliminate', title: 'Eliminate', hint: 'Neither', color: '#7a869a' },
]

export default function MatrixView() {
  const tasks = useStore((s) => s.tasks)
  const toggleTask = useStore((s) => s.toggleTask)
  const selectTask = useUI((s) => s.selectTask)

  const active = tasks.filter((t) => !t.completed)
  const byQuadrant: Record<Quadrant, typeof tasks> = { do: [], schedule: [], delegate: [], eliminate: [] }
  active.forEach((t) => byQuadrant[quadrantFor(t)].push(t))

  return (
    <div className="matrix-grid">
      {QUADRANTS.map((q) => (
        <div key={q.id} className="matrix-cell" style={{ borderTopColor: q.color }}>
          <div className="matrix-head">
            <span className="matrix-dot" style={{ background: q.color }} />
            <strong>{q.title}</strong>
            <span className="matrix-hint">{q.hint}</span>
            <span className="count">{byQuadrant[q.id].length}</span>
          </div>
          <div className="matrix-tasks">
            {byQuadrant[q.id].length === 0 && <div className="matrix-empty">Nothing here 🎉</div>}
            {byQuadrant[q.id].map((t) => (
              <div key={t.id} className="matrix-task" onClick={() => selectTask(t.id)}>
                <button
                  className={cx('checkbox', t.priority ? `p${t.priority}` : '')}
                  style={{ width: 17, height: 17 }}
                  onClick={(e) => { e.stopPropagation(); toggleTask(t.id) }}
                >
                  {t.completed && <Check size={11} strokeWidth={3} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="matrix-task-title">{t.title}</div>
                  {t.dueDate && <div className="meta-chip" style={{ fontSize: 11 }}>{formatDue(t.dueDate, t.hasTime)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
