import { useState } from 'react'
import { Copy, Trash2, Flag, FolderInput, Star, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useBackDismiss } from '../lib/backHandler'
import { getVisibleTasks, groupTasks } from '../lib/selectors'
import TaskItem from './TaskItem'
import type { Task, Priority } from '../types'
import { PRIORITY_META } from '../lib/utils'

interface Ctx {
  x: number
  y: number
  task: Task
}

export default function TaskListView() {
  const tasks = useStore((s) => s.tasks)
  const settings = useStore((s) => s.settings)
  const lists = useStore((s) => s.lists)
  const filters = useStore((s) => s.filters)
  const { updateTask, deleteTask, duplicateTask, moveTask } = useStore()
  const { selection, search, sort, group } = useUI()
  const [ctx, setCtx] = useState<Ctx | null>(null)
  useBackDismiss(!!ctx, () => setCtx(null))

  const visible = getVisibleTasks(tasks, selection, search, sort, settings.showCompleted, filters)
  const pinned = visible.filter((t) => t.pinned && !t.completed)
  const active = visible.filter((t) => !t.pinned && !t.completed)
  const completed = visible.filter((t) => t.completed)
  const buckets = groupTasks(active, group, lists)

  const openCtx = (e: React.MouseEvent, task: Task) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY, task })
  }

  if (visible.length === 0) {
    return (
      <div className="empty">
        <span className="emoji">🎉</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-soft)' }}>All clear!</div>
        <div>No tasks here. Add one above to get started.</div>
      </div>
    )
  }

  return (
    <div className="task-scroll" onClick={() => ctx && setCtx(null)}>
      {pinned.length > 0 && (
        <>
          <div className="task-group-title">📌 Pinned</div>
          {pinned.map((t) => (
            <TaskItem key={t.id} task={t} onContext={openCtx} />
          ))}
        </>
      )}

      {group === 'none'
        ? active.map((t) => <TaskItem key={t.id} task={t} onContext={openCtx} />)
        : buckets.map((b) => (
            <div key={b.key}>
              {b.title && <div className="task-group-title">{b.title} · {b.tasks.length}</div>}
              {b.tasks.map((t) => (
                <TaskItem key={t.id} task={t} onContext={openCtx} />
              ))}
            </div>
          ))}

      {completed.length > 0 && settings.showCompleted && selection.kind !== 'smart' && (
        <div className="task-group-title">Completed · {completed.length}</div>
      )}
      {(settings.showCompleted || (selection.kind === 'smart' && selection.id === 'completed')) &&
        completed.map((t) => <TaskItem key={t.id} task={t} onContext={openCtx} />)}

      {ctx && (
        <>
          <div className="modal-backdrop" style={{ background: 'transparent' }} onClick={() => setCtx(null)} />
          <div
            className="ctx-menu"
            style={{ left: Math.min(ctx.x, window.innerWidth - 200), top: Math.min(ctx.y, window.innerHeight - 320) }}
          >
            <button className="ctx-item" onClick={() => { updateTask(ctx.task.id, { pinned: !ctx.task.pinned }); setCtx(null) }}>
              <Star size={15} /> {ctx.task.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button className="ctx-item" onClick={() => { useStore.getState().toggleTask(ctx.task.id); setCtx(null) }}>
              <CheckCircle2 size={15} /> {ctx.task.completed ? 'Mark incomplete' : 'Complete'}
            </button>
            <div className="ctx-sep" />
            <div style={{ padding: '4px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag size={12} /> PRIORITY
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '0 8px 6px' }}>
              {PRIORITY_META.map((p) => (
                <button
                  key={p.value}
                  className="emoji-pick"
                  style={{ color: p.color, flex: 1, borderColor: ctx.task.priority === p.value ? p.color : undefined }}
                  onClick={() => { updateTask(ctx.task.id, { priority: p.value as Priority }); setCtx(null) }}
                  title={p.label}
                >
                  <Flag size={14} fill={p.value ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <div className="ctx-sep" />
            <div style={{ padding: '4px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderInput size={12} /> MOVE TO
            </div>
            {lists.map((l) => (
              <button
                key={l.id}
                className="ctx-item"
                onClick={() => {
                  moveTask(ctx.task.id, l.id, l.kanban ? l.columns[0]?.id ?? null : null)
                  setCtx(null)
                }}
              >
                <span>{l.emoji}</span> {l.name}
              </button>
            ))}
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { duplicateTask(ctx.task.id); setCtx(null) }}>
              <Copy size={15} /> Duplicate
            </button>
            <button className="ctx-item danger" onClick={() => { deleteTask(ctx.task.id); setCtx(null) }}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
