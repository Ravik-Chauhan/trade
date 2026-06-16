import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths, format,
} from 'date-fns'
import { useStore } from '../store/useStore'
import { advanceRecurrence } from '../lib/date'
import type { Task } from '../types'
import { cx } from '../lib/utils'

/**
 * Read-only month calendar that highlights the days a task lands on. For a
 * recurring task it projects future occurrences (honoring the recurrence's end
 * conditions); for a one-off task it just marks the due date.
 */
export default function OccurrencePreview({ task, onToggleDay }: { task: Task; onToggleDay?: (dateKey: string) => void }) {
  const weekStartsMonday = useStore((s) => s.settings.weekStartsMonday)
  const [cursor, setCursor] = useState(() => (task.dueDate ? new Date(task.dueDate.slice(0, 10)) : new Date()))

  const weekOpts = { weekStartsOn: (weekStartsMonday ? 1 : 0) as 0 | 1 }
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), weekOpts),
    end: endOfWeek(endOfMonth(cursor), weekOpts),
  })
  const weekdays = weekStartsMonday
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const occ = occurrencesInMonth(task, cursor)
  const done = new Set(task.recurrenceLog)
  const doneThisMonth = [...done].filter((d) => d.slice(0, 7) === format(cursor, 'yyyy-MM')).length

  return (
    <div style={{ marginTop: 14 }}>
      <div className="detail-label" style={{ marginBottom: 8 }}>Monthly view</div>
      <div className="cal-toolbar" style={{ marginBottom: 10 }}>
        <strong>{format(cursor, 'MMMM yyyy')}</strong>
        <span className="subtitle" style={{ marginLeft: 8 }}>
          {occ.size} {occ.size === 1 ? 'occurrence' : 'occurrences'}
          {doneThisMonth > 0 && ` · ${doneThisMonth} done`}
        </span>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <button className="icon-btn" onClick={() => setCursor(new Date())} title="This month" style={{ width: 'auto', padding: '0 8px', fontSize: 12 }}>Today</button>
        <button className="icon-btn" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>

      <div className="track-grid">
        {weekdays.map((d, i) => <div key={i} className="track-weekday">{d}</div>)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const outside = !isSameMonth(day, cursor)
          const isDone = done.has(key)
          const isOcc = occ.has(key)
          const interactive = !!onToggleDay && task.recurrence.rule !== 'none' && (isDone || isOcc)
          return (
            <div
              key={key}
              role={interactive ? 'button' : undefined}
              title={interactive ? (isDone ? 'Tap to undo this completion' : 'Tap to mark this day done') : undefined}
              onClick={interactive ? () => onToggleDay!(key) : undefined}
              className={cx('track-day', interactive && 'clickable', outside && 'muted', isToday(day) && 'today', isDone && 'occ-done', isOcc && !isDone && 'occ')}
            >
              <span className="track-daynum">{format(day, 'd')}</span>
              {isDone ? <Check size={12} strokeWidth={3} className="occ-check" /> : isOcc ? <span className="occ-dot" /> : null}
            </div>
          )
        })}
      </div>

      <div className="track-legend" style={{ marginTop: 10 }}>
        <span className="track-legend-item"><span className="occ-dot" /> scheduled</span>
        <span className="track-legend-item"><Check size={11} strokeWidth={3} className="occ-check" /> completed</span>
      </div>

      {task.recurrence.rule === 'none' ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
          One-off task — the due date is highlighted. Set a Repeat above to see recurring days.
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
          Tap a completed day to undo it, or a scheduled day to mark it done.
        </div>
      )}
    </div>
  )
}

/** Collect the task's occurrence dates (yyyy-MM-dd) that fall in the cursor's month. */
function occurrencesInMonth(task: Task, cursor: Date): Set<string> {
  const set = new Set<string>()
  if (!task.dueDate) return set
  const monthEnd = format(endOfMonth(cursor), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(cursor), 'yyyy-MM-dd')
  const add = (d: string) => {
    const day = d.slice(0, 10)
    if (day >= monthStart && day <= monthEnd) set.add(day)
  }

  let cur = task.dueDate
  let rec = task.recurrence
  add(cur)
  if (rec.rule === 'none') return set

  // step forward through the series until we pass the visible month (bounded)
  for (let guard = 0; guard < 2000; guard++) {
    const { date, recurrence } = advanceRecurrence(cur, rec)
    if (!date || date.slice(0, 10) > monthEnd) break
    cur = date
    rec = recurrence
    add(cur)
  }
  return set
}
