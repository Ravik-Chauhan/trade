import { useState, type DragEvent } from 'react'
import { Check, Calendar, Repeat, Star, Flag, ListChecks, Bell, Hourglass, CalendarCheck, StickyNote } from 'lucide-react'
import type { Task } from '../types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { cx } from '../lib/utils'
import { formatDue, isPastDue, isTimePast, isDueToday, relativeDays, todayISO } from '../lib/date'
import { dayProgress } from '../lib/tracking'

interface Props {
  task: Task
  onContext?: (e: React.MouseEvent, task: Task) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

function countdownLabel(due: string): string {
  const diff = relativeDays(due)
  if (diff === null) return ''
  if (diff === 0) return 'today'
  if (diff < 0) return `${-diff}d ago`
  return `${diff}d left`
}

export default function TaskItem({ task, onContext, selectMode = false, selected = false, onToggleSelect }: Props) {
  const toggleTask = useStore((s) => s.toggleTask)
  const toggleSlot = useStore((s) => s.toggleSlot)
  const updateTask = useStore((s) => s.updateTask)
  const reorderTask = useStore((s) => s.reorderTask)
  const lists = useStore((s) => s.lists)
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  const selectTask = useUI((s) => s.selectTask)
  const [dropping, setDropping] = useState(false)

  const pClass = task.priority ? `p${task.priority}` : ''
  const doneSubs = task.subtasks.filter((s) => s.done).length
  const list = lists.find((l) => l.id === task.listId)
  const today = todayISO()
  const isNote = task.kind === 'note'
  const overdue = !task.completed && isPastDue(task.dueDate, task.hasTime)
  const prog = task.trackingEnabled ? dayProgress(task, today) : null
  const trackingComplete = prog ? prog.total > 0 && prog.done === prog.total : false
  const noteSnippet = isNote ? task.notes.trim().split('\n').filter(Boolean).slice(0, 2).join(' · ') : ''

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
      className={cx('task-item', task.completed && 'done', (selectedTaskId === task.id || (selectMode && selected)) && 'selected', dropping && 'drop-target')}
      onClick={() => (selectMode ? onToggleSelect?.(task.id) : selectTask(task.id))}
      onContextMenu={(e) => onContext?.(e, task)}
      draggable={!selectMode}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {selectMode && (
        <span className={cx('sel-box', selected && 'on')} aria-hidden>
          {selected && <Check size={13} strokeWidth={3} />}
        </span>
      )}
      {selectMode ? null : isNote ? (
        <span className="note-badge" aria-label="Note">
          <StickyNote size={15} />
        </span>
      ) : task.trackingEnabled ? (
        <span className={cx('track-badge', trackingComplete && 'complete')} title="Today's progress" aria-label="Daily tracking">
          {trackingComplete ? <Check size={11} strokeWidth={3} /> : `${prog!.done}/${prog!.total}`}
        </span>
      ) : (
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
      )}

      <div className="task-body">
        <div className="task-title">
          {task.trackingEnabled && <CalendarCheck size={13} style={{ verticalAlign: -2, marginRight: 5, color: 'var(--accent)' }} />}
          {task.title}
        </div>

        {isNote && noteSnippet && <div className="note-snippet">{noteSnippet}</div>}

        {task.trackingEnabled && (
          <div className="slot-chips">
            {task.slots.map((slot) => {
              const done = (task.completionLog[today] ?? []).includes(slot.id)
              const slotOverdue = !done && isTimePast(today, slot.time)
              return (
                <button
                  key={slot.id}
                  className={cx('slot-chip', done && 'done', slotOverdue && 'overdue')}
                  title={slotOverdue ? 'Overdue' : undefined}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSlot(task.id, today, slot.id)
                  }}
                >
                  {done && <Check size={10} strokeWidth={3} />}
                  {slot.label}{slot.time ? ` ${slot.time}` : ''}
                </button>
              )
            })}
          </div>
        )}

        {(task.dueDate || task.tags.length > 0 || task.recurrence.rule !== 'none' || task.subtasks.length > 0 || task.priority > 0 || task.reminders.length > 0) && (
          <div className="task-meta">
            {overdue && <span className="meta-chip overdue-tag">⏰ Overdue</span>}
            {task.dueDate && (
              <span
                className={cx(
                  'meta-chip',
                  overdue && 'due-overdue',
                  !overdue && isDueToday(task.dueDate) && 'due-today'
                )}
              >
                <Calendar size={12} />
                {formatDue(task.dueDate, task.hasTime)}
              </span>
            )}
            {task.countdown && task.dueDate && !task.completed && (
              <span className="meta-chip due-today">
                <Hourglass size={12} />
                {countdownLabel(task.dueDate)}
              </span>
            )}
            {task.recurrence.rule !== 'none' && (
              <span className="meta-chip">
                <Repeat size={12} />
              </span>
            )}
            {task.reminders.length > 0 && (
              <span className="meta-chip">
                <Bell size={12} />
                {task.reminders.length > 1 ? task.reminders.length : ''}
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

      {!selectMode && (
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
      )}
    </div>
  )
}
