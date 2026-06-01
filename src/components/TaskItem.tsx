import { useState, type DragEvent } from 'react'
import { Check, Calendar, Repeat, Star, Flag, ListChecks, Bell } from 'lucide-react'
import type { Task } from '../types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { cx } from '../lib/utils'
import { formatDue, isOverdue, isDueToday } from '../lib/date'

interface Props {
  task: Task
  onContext?: (e: React.MouseEvent, task: Task) => void
}

export default function TaskItem({ task, onContext }: Props) {
  const toggleTask = useStore((s) => s.toggleTask)
  const updateTask = useStore((s) => s.updateTask)
  const reorderTask = useStore((s) => s.reorderTask)
  const lists = useStore((s) => s.lists)
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  const selectTask = useUI((s) => s.selectTask)
  const [dropping, setDropping] = useState(false)

  const pClass = task.priority ? `p${task.priority}` : ''
  const doneSubs = task.subtasks.filter((s) => s.done).length
  const list = lists.find((l) => l.id === task.listId)

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/task-id', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const id = e.dataTransfer.getData('text/task-id')
    if (id && id !== task.id) reorderTask(id, task.id)
  }

  return (
    <div
      className={cx('task-item', task.completed && 'done', selectedTaskId === task.id && 'selected', dropping && 'drop-target')}
      onClick={() => selectTask(task.id)}
      onContextMenu={(e) => onContext?.(e, task)}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <button
        className={cx('checkbox', pClass, task.completed && 'checked')}
        onClick={(e) => {
          e.stopPropagation()
          toggleTask(task.id)
        }}
        aria-label="Toggle complete"
      >
        {task.completed && <Check size={13} strokeWidth={3} />}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>

        {(task.dueDate || task.tags.length > 0 || task.repeat !== 'none' || task.subtasks.length > 0 || task.priority > 0 || task.reminder) && (
          <div className="task-meta">
            {task.dueDate && (
              <span
                className={cx(
                  'meta-chip',
                  isOverdue(task.dueDate) && !task.completed && 'due-overdue',
                  isDueToday(task.dueDate) && 'due-today'
                )}
              >
                <Calendar size={12} />
                {formatDue(task.dueDate, task.hasTime)}
              </span>
            )}
            {task.repeat !== 'none' && (
              <span className="meta-chip">
                <Repeat size={12} />
              </span>
            )}
            {task.reminder && (
              <span className="meta-chip">
                <Bell size={12} />
              </span>
            )}
            {task.priority > 0 && (
              <span className="meta-chip" style={{ color: ['', '#4772fa', 'var(--amber)', 'var(--red)'][task.priority] }}>
                <Flag size={12} fill="currentColor" />
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="meta-chip">
                <ListChecks size={12} />
                {doneSubs}/{task.subtasks.length}
              </span>
            )}
            {task.tags.map((t) => (
              <span key={t} className="tag-chip">
                #{t}
              </span>
            ))}
            {list && task.listId !== 'inbox' && (
              <span className="meta-chip" style={{ color: list.color }}>
                {list.emoji} {list.name}
              </span>
            )}
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div className="progress-mini">
            <div style={{ width: `${(doneSubs / task.subtasks.length) * 100}%` }} />
          </div>
        )}
      </div>

      <button
        className={cx('task-star', 'icon-btn', task.pinned && 'on')}
        style={{ width: 28, height: 28 }}
        onClick={(e) => {
          e.stopPropagation()
          updateTask(task.id, { pinned: !task.pinned })
        }}
        aria-label="Pin"
      >
        <Star size={15} fill={task.pinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
