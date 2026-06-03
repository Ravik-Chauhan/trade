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
import { Hourglass, X as XIcon, CalendarCheck, Flame, StickyNote, CheckSquare } from 'lucide-react'
import { cx, PRIORITY_META } from '../lib/utils'
import type { Priority, RepeatRule, Recurrence, Task } from '../types'
import { NO_RECURRENCE } from '../types'
import TaskTrackingCalendar from './TaskTrackingCalendar'
import { SLOT_PRESETS, makeSlot, trackingStreak } from '../lib/tracking'
import { todayISO, format, addDays, parseISO } from '../lib/date'

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
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

  const isNote = task.kind === 'note'
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
        {isNote ? (
          <span className="note-badge" aria-label="Note"><StickyNote size={15} /></span>
        ) : (
          <button
            className={cx('checkbox', task.priority ? `p${task.priority}` : '', task.completed && 'checked')}
            onClick={() => toggleTask(task.id)}
          >
            {task.completed && <Check size={13} strokeWidth={3} />}
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {isNote ? 'Note' : task.completed ? 'Completed' : 'Task'}
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
            placeholder={isNote ? 'Note title' : 'Task name'}
          />
        </div>

        <div className="addbar-toggle" style={{ marginTop: 12 }} role="group" aria-label="Item type">
          <button
            className={cx(!isNote && 'active')}
            onClick={() => updateTask(task.id, { kind: 'task' })}
          >
            <CheckSquare size={14} /> Task
          </button>
          <button
            className={cx(isNote && 'active')}
            onClick={() => updateTask(task.id, { kind: 'note' })}
          >
            <StickyNote size={14} /> Note
          </button>
        </div>

        <div className="detail-section">
          <div className="detail-label">{isNote ? 'Content' : 'Notes'}</div>
          <textarea
            className="notes-area"
            style={isNote ? { minHeight: 240 } : undefined}
            value={task.notes}
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
            placeholder={isNote ? 'Write your note…' : 'Add notes, links, or details…'}
          />
        </div>

        {!isNote && (<>
        <TrackingSection task={task} />

        {!task.trackingEnabled && (<>
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

          <RecurrenceEditor
            value={task.recurrence}
            disabled={!task.dueDate}
            onChange={(rec) => updateTask(task.id, { recurrence: rec })}
          />

          <div className="field" style={{ marginTop: 8 }}>
            <label><Hourglass size={15} /> Show countdown</label>
            <button
              className={cx('toggle', task.countdown && 'on')}
              disabled={!task.dueDate}
              onClick={() => updateTask(task.id, { countdown: !task.countdown })}
            />
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label"><Bell size={12} style={{ verticalAlign: -1 }} /> Reminders</div>
          {task.reminders.map((r, i) => (
            <div key={i} className="subtask-row">
              <Bell size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                className="sub-text"
                type="datetime-local"
                value={r.slice(0, 16)}
                onChange={(e) => {
                  const next = [...task.reminders]
                  next[i] = e.target.value
                  updateTask(task.id, { reminders: next.filter(Boolean) })
                }}
              />
              <button
                className="icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => updateTask(task.id, { reminders: task.reminders.filter((_, j) => j !== i) })}
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
          <button
            className="add-sub"
            style={{ width: '100%' }}
            onClick={() => {
              const base = task.dueDate ? task.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
              updateTask(task.id, { reminders: [...task.reminders, `${base}T09:00`] })
            }}
          >
            <Plus size={16} /> Add reminder
          </button>
        </div>
        </>)}

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
        </>)}

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

function RecurrenceEditor({
  value,
  disabled,
  onChange,
}: {
  value: Recurrence
  disabled: boolean
  onChange: (rec: Recurrence) => void
}) {
  const showInterval = value.rule !== 'none' && value.rule !== 'weekdays'
  const unitLabel: Partial<Record<RepeatRule, string>> = {
    daily: 'day(s)',
    weekly: 'week(s)',
    monthly: 'month(s)',
    yearly: 'year(s)',
  }
  return (
    <div style={{ marginTop: 8, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div className="field">
        <label><Repeat size={15} /> Repeat</label>
        <select
          value={value.rule}
          onChange={(e) => {
            const rule = e.target.value as RepeatRule
            if (rule === 'none') onChange({ ...NO_RECURRENCE })
            else onChange({ ...value, rule, count: 0 })
          }}
        >
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {showInterval && (
        <div className="field" style={{ marginTop: 8 }}>
          <label>Every</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              min={1}
              style={{ width: 60, textAlign: 'right' }}
              value={value.interval}
              onChange={(e) => onChange({ ...value, interval: Math.max(1, Number(e.target.value)) })}
            />
            <span style={{ color: 'var(--text-muted)' }}>{unitLabel[value.rule]}</span>
          </div>
        </div>
      )}

      {value.rule !== 'none' && (
        <div className="field" style={{ marginTop: 8 }}>
          <label>Ends</label>
          <select
            value={value.endType}
            onChange={(e) => onChange({ ...value, endType: e.target.value as Recurrence['endType'] })}
          >
            <option value="never">Never</option>
            <option value="afterCount">After N times</option>
            <option value="onDate">On date</option>
          </select>
        </div>
      )}

      {value.rule !== 'none' && value.endType === 'afterCount' && (
        <div className="field" style={{ marginTop: 8 }}>
          <label>Occurrences</label>
          <input
            type="number"
            min={1}
            style={{ width: 70, textAlign: 'right' }}
            value={value.endCount}
            onChange={(e) => onChange({ ...value, endCount: Math.max(1, Number(e.target.value)) })}
          />
        </div>
      )}

      {value.rule !== 'none' && value.endType === 'onDate' && (
        <div className="field" style={{ marginTop: 8 }}>
          <label>End date</label>
          <input
            type="date"
            value={value.endDate ?? ''}
            onChange={(e) => onChange({ ...value, endDate: e.target.value || null })}
          />
        </div>
      )}
    </div>
  )
}

function TrackingSection({ task }: { task: Task }) {
  const setTracking = useStore((s) => s.setTracking)
  const setSlots = useStore((s) => s.setSlots)
  const today = todayISO()
  const dayBefore = (key: string, n: number) => format(addDays(parseISO(key), -n), 'yyyy-MM-dd')
  const streak = task.trackingEnabled ? trackingStreak(task, today, dayBefore) : 0

  return (
    <div className="detail-section">
      <div className="switch">
        <div>
          <div className="detail-label" style={{ marginBottom: 2 }}>
            <CalendarCheck size={12} style={{ verticalAlign: -1 }} /> Daily tracking
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Track this every day, once or multiple times (e.g. morning &amp; evening)
          </div>
        </div>
        <button
          className={cx('toggle', task.trackingEnabled && 'on')}
          onClick={() => setTracking(task.id, !task.trackingEnabled)}
        />
      </div>

      {task.trackingEnabled && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {SLOT_PRESETS.map((p) => (
              <button
                key={p.label}
                className="pill"
                onClick={() => setSlots(task.id, p.slots.map((s) => makeSlot(s.label, s.time)))}
              >
                {p.label}
              </button>
            ))}
          </div>

          {task.slots.map((slot, i) => (
            <div key={slot.id} className="field" style={{ marginBottom: 8 }}>
              <input
                style={{ border: 'none', background: 'none', outline: 'none', flex: 1, minWidth: 0, color: 'var(--text)' }}
                value={slot.label}
                placeholder={`Slot ${i + 1}`}
                onChange={(e) =>
                  setSlots(task.id, task.slots.map((s) => (s.id === slot.id ? { ...s, label: e.target.value } : s)))
                }
              />
              <input
                type="time"
                style={{ border: 'none', background: 'none', outline: 'none', color: 'var(--text-soft)', width: 90 }}
                value={slot.time ?? ''}
                onChange={(e) =>
                  setSlots(task.id, task.slots.map((s) => (s.id === slot.id ? { ...s, time: e.target.value || null } : s)))
                }
              />
              <button
                className="icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => setSlots(task.id, task.slots.filter((s) => s.id !== slot.id))}
                aria-label="Remove slot"
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
          <button className="add-sub" style={{ width: '100%', marginBottom: 14 }} onClick={() => setSlots(task.id, [...task.slots, makeSlot('')])}>
            <Plus size={16} /> Add time slot
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--text-soft)' }}>
            <Flame size={14} style={{ color: streak > 0 ? 'var(--amber)' : undefined }} />
            <strong>{streak}</strong> day perfect streak
          </div>

          <TaskTrackingCalendar task={task} />
        </div>
      )}
    </div>
  )
}
