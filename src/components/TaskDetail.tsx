import { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Bell,
  Flag,
  Hash,
  Trash2,
  Plus,
  Check,
  Star,
  List as ListIcon,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { cx, PRIORITY_META } from '../lib/utils'
import type { Priority, RepeatRule } from '../types'

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
]

export default function TaskDetail() {
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  const selectTask = useUI((s) => s.selectTask)
  const task = useStore((s) => s.tasks.find((t) => t.id === selectedTaskId))
  const allTags = useStore((s) => s.tags)
  const lists = useStore((s) => s.lists)
  const {
    updateTask,
    deleteTask,
    toggleTask,
    addSubtask,
    toggleSubtask,
    updateSubtask,
    deleteSubtask,
    addTag,
    moveTask,
  } = useStore()

  const [newSub, setNewSub] = useState('')
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    setNewSub('')
    setTagInput('')
  }, [selectedTaskId])

  if (!task) return null

  const close = () => selectTask(null)
  const dateValue = task.dueDate ? task.dueDate.slice(0, 10) : ''
  const timeValue = task.hasTime && task.dueDate ? task.dueDate.slice(11, 16) : ''

  const setDate = (date: string, time: string) => {
    if (!date) {
      updateTask(task.id, { dueDate: null, hasTime: false })
      return
    }
    if (time) updateTask(task.id, { dueDate: `${date}T${time}:00`, hasTime: true })
    else updateTask(task.id, { dueDate: date, hasTime: false })
  }

  const toggleTag = (name: string) => {
    const has = task.tags.includes(name)
    updateTask(task.id, { tags: has ? task.tags.filter((t) => t !== name) : [...task.tags, name] })
  }

  const commitTag = () => {
    const clean = tagInput.trim().replace(/^#/, '')
    if (!clean) return
    addTag(clean)
    if (!task.tags.includes(clean)) updateTask(task.id, { tags: [...task.tags, clean] })
    setTagInput('')
  }

  return (
    <div className="detail">
      <div className="detail-header">
        <button
          className={cx('checkbox', task.priority ? `p${task.priority}` : '', task.completed && 'checked')}
          onClick={() => toggleTask(task.id)}
        >
          {task.completed && <Check size={13} strokeWidth={3} />}
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {task.completed ? 'Completed' : 'Task'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className={cx('icon-btn', task.pinned && 'on')}
          style={{ color: task.pinned ? 'var(--amber)' : undefined }}
          onClick={() => updateTask(task.id, { pinned: !task.pinned })}
          title="Pin"
        >
          <Star size={17} fill={task.pinned ? 'currentColor' : 'none'} />
        </button>
        <button className="icon-btn" onClick={close} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="detail-scroll">
        <div className="detail-title-row">
          <textarea
            className="detail-title"
            value={task.title}
            rows={1}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            placeholder="Task name"
          />
        </div>

        <div className="detail-section">
          <div className="detail-label">Notes</div>
          <textarea
            className="notes-area"
            value={task.notes}
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
            placeholder="Add notes, links, or details…"
          />
        </div>

        <div className="detail-section">
          <div className="detail-label">Schedule</div>
          <div className="field-grid">
            <div className="field">
              <label><Calendar size={15} /> Due date</label>
              <input type="date" value={dateValue} onChange={(e) => setDate(e.target.value, timeValue)} />
            </div>
            <div className="field">
              <label><Clock size={15} /> Time</label>
              <input
                type="time"
                value={timeValue}
                disabled={!dateValue}
                onChange={(e) => setDate(dateValue, e.target.value)}
              />
            </div>
            <div className="field">
              <label><Repeat size={15} /> Repeat</label>
              <select value={task.repeat} onChange={(e) => updateTask(task.id, { repeat: e.target.value as RepeatRule })}>
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label><Bell size={15} /> Reminder</label>
              <input
                type="datetime-local"
                value={task.reminder ? task.reminder.slice(0, 16) : ''}
                onChange={(e) => updateTask(task.id, { reminder: e.target.value ? e.target.value : null })}
              />
            </div>
            <div className="field">
              <label><ListIcon size={15} /> List</label>
              <select
                value={task.listId}
                onChange={(e) => {
                  const l = lists.find((x) => x.id === e.target.value)
                  moveTask(task.id, e.target.value, l?.kanban ? l.columns[0]?.id ?? null : null)
                }}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label"><Flag size={12} style={{ verticalAlign: -1 }} /> Priority</div>
          <div className="priority-picker">
            {PRIORITY_META.map((p) => (
              <button
                key={p.value}
                className={cx('pill', task.priority === p.value && 'active')}
                onClick={() => updateTask(task.id, { priority: p.value as Priority })}
              >
                <Flag size={13} style={{ color: p.color }} fill={p.value ? p.color : 'none'} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">
            Subtasks {task.subtasks.length > 0 && `· ${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}`}
          </div>
          {task.subtasks.map((st) => (
            <div key={st.id} className={cx('subtask-row', st.done && 'done')}>
              <button className={cx('mini-check', st.done && 'checked')} onClick={() => toggleSubtask(task.id, st.id)}>
                {st.done && <Check size={11} strokeWidth={3} />}
              </button>
              <input
                className="sub-text"
                value={st.title}
                onChange={(e) => updateSubtask(task.id, st.id, e.target.value)}
              />
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => deleteSubtask(task.id, st.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="add-sub">
            <Plus size={16} />
            <input
              placeholder="Add subtask"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSub.trim()) {
                  addSubtask(task.id, newSub)
                  setNewSub('')
                }
              }}
            />
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label"><Hash size={12} style={{ verticalAlign: -1 }} /> Tags</div>
          <div className="tag-picker">
            {allTags.map((t) => (
              <button
                key={t.id}
                className={cx('pill', task.tags.includes(t.name) && 'active')}
                onClick={() => toggleTag(t.name)}
              >
                <span className="dot" style={{ background: t.color }} /> {t.name}
              </button>
            ))}
          </div>
          <div className="add-sub" style={{ marginTop: 8 }}>
            <Hash size={15} />
            <input
              placeholder="New tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitTag()}
            />
          </div>
        </div>
      </div>

      <div className="detail-footer">
        <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
        <button
          className="danger-btn"
          onClick={() => {
            deleteTask(task.id)
            close()
          }}
        >
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </div>
  )
}
