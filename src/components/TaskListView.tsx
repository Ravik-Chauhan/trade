import { useState } from 'react'
import { Copy, Trash2, Flag, FolderInput, Star, CheckCircle2, ListChecks, SkipForward, X } from 'lucide-react'
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
  const [selectMode, setSelectMode] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  useBackDismiss(!!ctx, () => setCtx(null))
  useBackDismiss(selectMode, () => exitSelect())

  const visible = getVisibleTasks(tasks, selection, search, sort, settings.showCompleted, filters)
  const pinned = visible.filter((t) => t.pinned && !t.completed)
  const active = visible.filter((t) => !t.pinned && !t.completed)
  const completed = visible.filter((t) => t.completed)
  const buckets = groupTasks(active, group, lists)

  const openCtx = (e: React.MouseEvent, task: Task) => {
    e.preventDefault()
    setCtx({ x: e.clientX, y: e.clientY, task })
  }

  const exitSelect = () => {
    setSelectMode(false)
    setSel(new Set())
  }
  const startSelect = (id: string) => {
    setCtx(null)
    setSelectMode(true)
    setSel(new Set([id]))
  }
  const toggleSelect = (id: string) => {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allVisibleSelected = visible.length > 0 && visible.every((t) => sel.has(t.id))
  const toggleSelectAll = () => setSel(allVisibleSelected ? new Set() : new Set(visible.map((t) => t.id)))

  const bulkComplete = () => {
    sel.forEach((id) => {
      const t = tasks.find((x) => x.id === id)
      if (t && !t.completed) useStore.getState().toggleTask(id)
    })
    exitSelect()
  }
  const bulkSkip = () => {
    sel.forEach((id) => useStore.getState().skipTask(id))
    exitSelect()
  }
  const bulkDelete = () => {
    if (sel.size === 0) return
    if (!window.confirm(`Delete ${sel.size} task${sel.size > 1 ? 's' : ''}? This can't be undone.`)) return
    sel.forEach((id) => deleteTask(id))
    exitSelect()
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

  const itemProps = { onContext: openCtx, selectMode, onToggleSelect: toggleSelect }

  return (
    <div className="task-scroll" onClick={() => ctx && setCtx(null)}>
      {pinned.length > 0 && (
        <>
          <div className="task-group-title">📌 Pinned</div>
          {pinned.map((t) => (
            <TaskItem key={t.id} task={t} selected={sel.has(t.id)} {...itemProps} />
          ))}
        </>
      )}

      {group === 'none'
        ? active.map((t) => <TaskItem key={t.id} task={t} selected={sel.has(t.id)} {...itemProps} />)
        : buckets.map((b) => (
            <div key={b.key}>
              {b.title && <div className="task-group-title">{b.title} · {b.tasks.length}</div>}
              {b.tasks.map((t) => (
                <TaskItem key={t.id} task={t} selected={sel.has(t.id)} {...itemProps} />
              ))}
            </div>
          ))}

      {completed.length > 0 && settings.showCompleted && selection.kind !== 'smart' && (
        <div className="task-group-title">Completed · {completed.length}</div>
      )}
      {(settings.showCompleted || (selection.kind === 'smart' && selection.id === 'completed')) &&
        completed.map((t) => <TaskItem key={t.id} task={t} selected={sel.has(t.id)} {...itemProps} />)}

      {ctx && (
        <>
          <div className="modal-backdrop" style={{ background: 'transparent' }} onClick={() => setCtx(null)} />
          <div
            className="ctx-menu"
            style={{
              left: Math.max(8, Math.min(ctx.x, window.innerWidth - 220)),
              top: Math.max(8, Math.min(ctx.y, window.innerHeight - 8 - Math.min(window.innerHeight * 0.7, 460))),
              maxHeight: Math.min(window.innerHeight * 0.7, 460),
              overflowY: 'auto',
            }}
          >
            <button className="ctx-item" onClick={() => startSelect(ctx.task.id)}>
              <ListChecks size={15} /> Select multiple
            </button>
            <div className="ctx-sep" />
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

      {selectMode && (
        <div className="bulk-bar" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" onClick={exitSelect} aria-label="Cancel selection">
            <X size={18} />
          </button>
          <span className="bulk-count">{sel.size} selected</span>
          <button className="btn ghost" onClick={toggleSelectAll}>
            {allVisibleSelected ? 'None' : 'All'}
          </button>
          <div className="bulk-spacer" />
          <button className="btn" onClick={bulkComplete} disabled={sel.size === 0}>
            <CheckCircle2 size={16} /> Done
          </button>
          <button className="btn" onClick={bulkSkip} disabled={sel.size === 0}>
            <SkipForward size={16} /> Skip
          </button>
          <button className="btn danger" onClick={bulkDelete} disabled={sel.size === 0}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
