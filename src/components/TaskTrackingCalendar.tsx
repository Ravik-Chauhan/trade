import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, isAfter, addMonths, subMonths, format,
} from 'date-fns'
import { useStore } from '../store/useStore'
import type { Task } from '../types'
import { cx } from '../lib/utils'

const SLOT_COLORS = ['#4772fa', '#9b51e0', '#36b37e', '#f5a623', '#00b8d9']

export default function TaskTrackingCalendar({ task }: { task: Task }) {
  const toggleSlot = useStore((s) => s.toggleSlot)
  const weekStartsMonday = useStore((s) => s.settings.weekStartsMonday)
  const [cursor, setCursor] = useState(new Date())

  const weekOpts = { weekStartsOn: (weekStartsMonday ? 1 : 0) as 0 | 1 }
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), weekOpts),
    end: endOfWeek(endOfMonth(cursor), weekOpts),
  })
  const weekdays = weekStartsMonday
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // monthly completion rate (past + today, slots done / slots expected)
  const monthDays = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })
    .filter((d) => !isAfter(d, new Date()))
  let expected = 0, done = 0
  monthDays.forEach((d) => {
    const key = format(d, 'yyyy-MM-dd')
    const log = new Set(task.completionLog[key] ?? [])
    expected += task.slots.length
    done += task.slots.filter((s) => log.has(s.id)).length
  })
  const rate = expected ? Math.round((done / expected) * 100) : 0

  return (
    <div>
      <div className="cal-toolbar" style={{ marginBottom: 10 }}>
        <strong>{format(cursor, 'MMMM yyyy')}</strong>
        <span className="subtitle" style={{ marginLeft: 8 }}>{done}/{expected} doses · {rate}%</span>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft size={16} /></button>
        <button className="icon-btn" onClick={() => setCursor(new Date())} title="This month" style={{ width: 'auto', padding: '0 8px', fontSize: 12 }}>Today</button>
        <button className="icon-btn" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight size={16} /></button>
      </div>

      <div className="track-grid">
        {weekdays.map((d, i) => <div key={i} className="track-weekday">{d}</div>)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const log = new Set(task.completionLog[key] ?? [])
          const past = !isAfter(day, new Date())
          const outside = !isSameMonth(day, cursor)
          return (
            <div key={key} className={cx('track-day', outside && 'muted', isToday(day) && 'today')}>
              <span className="track-daynum">{format(day, 'd')}</span>
              <div className="track-dots">
                {task.slots.map((slot, i) => {
                  const isDone = log.has(slot.id)
                  const missed = past && !isDone && !isToday(day)
                  const color = SLOT_COLORS[i % SLOT_COLORS.length]
                  return (
                    <button
                      key={slot.id}
                      className={cx('track-dot', isDone && 'done', missed && 'missed')}
                      style={isDone ? { background: color, borderColor: color } : undefined}
                      title={`${slot.label}${slot.time ? ' · ' + slot.time : ''} — ${isDone ? 'done' : missed ? 'missed' : 'not yet'}`}
                      onClick={() => toggleSlot(task.id, key, slot.id)}
                    >
                      {isDone && <Check size={9} strokeWidth={3.5} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="track-legend">
        {task.slots.map((slot, i) => (
          <span key={slot.id} className="track-legend-item">
            <span className="track-dot done" style={{ background: SLOT_COLORS[i % SLOT_COLORS.length], borderColor: SLOT_COLORS[i % SLOT_COLORS.length] }} />
            {slot.label}{slot.time ? ` · ${slot.time}` : ''}
          </span>
        ))}
        <span className="track-legend-item"><span className="track-dot missed" /> missed</span>
      </div>
    </div>
  )
}
