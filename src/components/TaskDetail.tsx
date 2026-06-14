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
  Save,
  EyeOff,
  SkipForward,
  List as ListIcon,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToasts } from '../store/useToasts'
import { Hourglass, X as XIcon, CalendarCheck, Flame, StickyNote, CheckSquare } from 'lucide-react'
import { cx, uid, PRIORITY_META } from '../lib/utils'
import type { Priority, RepeatRule, Recurrence, Task } from '../types'
import { NO_RECURRENCE } from '../types'
import TaskTrackingCalendar from './TaskTrackingCalendar'
import OccurrencePreview from './OccurrencePreview'
import { SLOT_PRESETS, makeSlot, trackingStreak } from '../lib/tracking'
import { todayISO, format, addDays, parseISO } from '../lib/date'

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom…' },
]

// Definition fields that the editor buffers locally until the user hits Save.
// Excludes live/action fields (completed, completionLog, pinned, …) so saving
// never clobbers a completion logged while editing.
const BUFFERED: (keyof Task)[] = [
  'title', 'notes', 'kind', 'dueDate', 'hasTime', 'startDate', 'listId', 'columnId',
  'priority', 'tags', 'recurrence', 'reminders', 'countdown', 'subtasks', 'hidePrivate',
]
const pick = (t: Task): Partial<Task> =>
  BUFFERED.reduce((o, k) => ({ ...o, [k]: t[k] }), {} as Partial<Task>)

export default function TaskDetail() {
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  const selectTask = useUI((s) => s.selectTask)
  const task = useStore((s) => s.tasks.find((t) => t.id === selectedTaskId))
  const allTags = useStore((s) => s.tags)
  const lists = useStore((s) => s.lists)
  const { updateTask, deleteTask, toggleTask, skipTask, addTag } = useStore()
  const pushToast = useToasts((s) => s.push)

  // local draft — all field edits go here and only commit on Save
  const [draft, setDraft] = useState<Task | null>(null)
  const [newSub, setNewSub] = useState('')
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    const t = useStore.getState().tasks.find((x) => x.id === selectedTaskId)
    setDraft(t ? (JSON.parse(JSON.stringify(t)) as Task) : null)
    setNewSub('')
    setTagInput('')
  }, [selectedTaskId])

  if (!task || !draft) return null

  const patch = (p: Partial<Task>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const dirty = JSON.stringify(pick(draft)) !== JSON.stringify(pick(task))

  const isNote = draft.kind === 'note'
  const close = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    selectTask(null)
  }
  const save = () => {
    updateTask(task.id, pick(draft))
    pushToast({ title: 'Saved', body: draft.title.trim() || 'Item updated', emoji: '✅' })
  }

  const dateValue = draft.dueDate ? draft.dueDate.slice(0, 10) : ''
  const timeValue = draft.hasTime && draft.dueDate ? draft.dueDate.slice(11, 16) : ''

  const setDate = (date: string, time: string) => {
    if (!date) {
      patch({ dueDate: null, hasTime: false })
      return
    }
    if (time) patch({ dueDate: `${date}T${time}:00`, hasTime: true })
    else patch({ dueDate: date, hasTime: false })
  }

  // subtasks operate on the draft
  const addSub = (title: string) => patch({ subtasks: [...draft.subtasks, { id: uid('s'), title: title.trim(), done: false }] })
  const toggleSub = (id: string) => patch({ subtasks: draft.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })
  const updateSub = (id: string, title: string) => patch({ subtasks: draft.subtasks.map((s) => (s.id === id ? { ...s, title } : s)) })
  const deleteSub = (id: string) => patch({ subtasks: draft.subtasks.filter((s) => s.id !== id) })

  const toggleTag = (name: string) => {
    const has = draft.tags.includes(name)
    patch({ tags: has ? draft.tags.filter((t) => t !== name) : [...draft.tags, name] })
  }

  const commitTag = () => {
    const clean = tagInput.trim().replace(/^#/, '')
    if (!clean) return
    addTag(clean)
    if (!draft.tags.includes(clean)) patch({ tags: [...draft.tags, clean] })
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
        {!isNote && task.recurrence.rule !== 'none' && task.dueDate && (
          <button
            className="icon-btn"
            onClick={() => skipTask(task.id)}
            title="Skip to next occurrence"
          >
            <SkipForward size={16} />
          </button>
        )}
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
            value={draft.title}
            rows={1}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={isNote ? 'Note title' : 'Task name'}
          />
        </div>

        <div className="addbar-toggle" style={{ marginTop: 12 }} role="group" aria-label="Item type">
          <button
            className={cx(!isNote && 'active')}
            onClick={() => patch({ kind: 'task' })}
          >
            <CheckSquare size={14} /> Task
          </button>
          <button
            className={cx(isNote && 'active')}
            onClick={() => patch({ kind: 'note' })}
          >
            <StickyNote size={14} /> Note
          </button>
        </div>

        <div className="detail-section">
          <div className="detail-label">{isNote ? 'Content' : 'Notes'}</div>
          <textarea
            className="notes-area"
            style={isNote ? { minHeight: 240 } : undefined}
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
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
                value={draft.listId}
                onChange={(e) => {
                  const l = lists.find((x) => x.id === e.target.value)
                  patch({ listId: e.target.value, columnId: l?.kanban ? l.columns[0]?.id ?? null : null })
                }}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <RecurrenceEditor
            value={draft.recurrence}
            disabled={!draft.dueDate}
            onChange={(rec) => patch({ recurrence: rec })}
          />

          <div className="field" style={{ marginTop: 8 }}>
            <label><Hourglass size={15} /> Show countdown</label>
            <button
              className={cx('toggle', draft.countdown && 'on')}
              disabled={!draft.dueDate}
              onClick={() => patch({ countdown: !draft.countdown })}
            />
          </div>

          {draft.dueDate && <OccurrencePreview task={draft} />}
        </div>

        <div className="detail-section">
          <div className="detail-label"><Bell size={12} style={{ verticalAlign: -1 }} /> Reminders</div>
          {draft.reminders.map((r, i) => (
            <div key={i} className="subtask-row">
              <Bell size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                className="sub-text"
                type="datetime-local"
                value={r.slice(0, 16)}
                onChange={(e) => {
                  const next = [...draft.reminders]
                  next[i] = e.target.value
                  patch({ reminders: next.filter(Boolean) })
                }}
              />
              <button
                className="icon-btn"
                style={{ width: 26, height: 26 }}
                onClick={() => patch({ reminders: draft.reminders.filter((_, j) => j !== i) })}
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
          <button
            className="add-sub"
            style={{ width: '100%' }}
            onClick={() => {
              const base = draft.dueDate ? draft.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
              patch({ reminders: [...draft.reminders, `${base}T09:00`] })
            }}
          >
            <Plus size={16} /> Add reminder
          </button>
        </div>
        </>)}

        <div className="detail-section">
          <div className="field">
            <label><EyeOff size={15} /> Hide details in notifications</label>
            <button
              className={cx('toggle', draft.hidePrivate && 'on')}
              onClick={() => patch({ hidePrivate: !draft.hidePrivate })}
            />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            When on, this task's reminders show only “You have a new reminder” — the title and details
            stay hidden on the lock screen until you open the app.
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label"><Flag size={12} style={{ verticalAlign: -1 }} /> Priority</div>
          <div className="priority-picker">
            {PRIORITY_META.map((p) => (
              <button
                key={p.value}
                className={cx('pill', draft.priority === p.value && 'active')}
                onClick={() => patch({ priority: p.value as Priority })}
              >
                <Flag size={13} style={{ color: p.color }} fill={p.value ? p.color : 'none'} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">
            Subtasks {draft.subtasks.length > 0 && `· ${draft.subtasks.filter((s) => s.done).length}/${draft.subtasks.length}`}
          </div>
          {draft.subtasks.map((st) => (
            <div key={st.id} className={cx('subtask-row', st.done && 'done')}>
              <button className={cx('mini-check', st.done && 'checked')} onClick={() => toggleSub(st.id)}>
                {st.done && <Check size={11} strokeWidth={3} />}
              </button>
              <input
                className="sub-text"
                value={st.title}
                onChange={(e) => updateSub(st.id, e.target.value)}
              />
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => deleteSub(st.id)}>
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
                  addSub(newSub)
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
                className={cx('pill', draft.tags.includes(t.name) && 'active')}
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
        <button
          className="danger-btn"
          onClick={() => {
            deleteTask(task.id)
            selectTask(null)
          }}
        >
          <Trash2 size={15} /> Delete
        </button>
        <button className="btn primary" onClick={save} disabled={!dirty}>
          <Save size={15} /> {dirty ? 'Save' : 'Saved'}
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
  const weekStartsMonday = useStore((s) => s.settings.weekStartsMonday)
  const showInterval = value.rule !== 'none' && value.rule !== 'weekdays' && value.rule !== 'custom'
  const unitLabel: Partial<Record<RepeatRule, string>> = {
    daily: 'day(s)',
    weekly: 'week(s)',
    monthly: 'month(s)',
    yearly: 'year(s)',
  }
  const weekdayOrder = weekStartsMonday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  const weekdayShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const toggleNum = (list: number[], n: number) =>
    list.includes(n) ? list.filter((x) => x !== n) : [...list, n]
  return (
    <div style={{ marginTop: 8, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div className="field">
        <label><Repeat size={15} /> Repeat</label>
        <select
          value={value.rule}
          onChange={(e) => {
            const rule = e.target.value as RepeatRule
            if (rule === 'none') onChange({ ...NO_RECURRENCE })
            else if (rule === 'custom')
              onChange({
                ...value,
                rule,
                count: 0,
                customUnit: value.customUnit ?? 'week',
                weekdays: value.weekdays ?? [],
                monthDays: value.monthDays ?? [],
              })
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

      {value.rule === 'custom' && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              className={cx('pill', value.customUnit === 'week' && 'active')}
              onClick={() => onChange({ ...value, customUnit: 'week' })}
            >
              Weekly
            </button>
            <button
              type="button"
              className={cx('pill', value.customUnit === 'month' && 'active')}
              onClick={() => onChange({ ...value, customUnit: 'month' })}
            >
              Monthly
            </button>
          </div>

          {value.customUnit === 'week' ? (
            <>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Repeat on these days</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {weekdayOrder.map((wd) => (
                  <button
                    key={wd}
                    type="button"
                    className={cx('pill', (value.weekdays ?? []).includes(wd) && 'active')}
                    style={{ padding: '5px 10px' }}
                    onClick={() => onChange({ ...value, weekdays: toggleNum(value.weekdays ?? [], wd) })}
                  >
                    {weekdayShort[wd]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Repeat on these dates</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((dom) => (
                  <button
                    key={dom}
                    type="button"
                    className={cx('pill', (value.monthDays ?? []).includes(dom) && 'active')}
                    style={{ padding: '5px 0', justifyContent: 'center', borderRadius: 8 }}
                    onClick={() => onChange({ ...value, monthDays: toggleNum(value.monthDays ?? [], dom) })}
                  >
                    {dom}
                  </button>
                ))}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
                Dates past the end of a short month (e.g. 31st) are skipped that month.
              </div>
            </>
          )}
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
