import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, isAfter, addMonths, subMonths, format,
} from 'date-fns'
import { useStore } from '../store/useStore'
import type { Habit } from '../types'
import { cx } from '../lib/utils'

function isRequiredDay(habit: Habit, date: Date): boolean {
  if (habit.freq.type === 'weekly') return true
  if (habit.freq.days.length === 0) return true
  return habit.freq.days.includes(date.getDay())
}

export default function HabitMonthCalendar({ habit }: { habit: Habit }) {
  const incrementHabit = useStore((s) => s.incrementHabit)
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

  // month summary: required days up to today that met the goal
  const monthDays = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })
    .filter((d) => !isAfter(d, new Date()))
  let required = 0, met = 0
  monthDays.forEach((d) => {
    if (!isRequiredDay(habit, d)) return
    required++
    if ((habit.log[format(d, 'yyyy-MM-dd')] ?? 0) >= habit.goal) met++
  })
  const rate = required ? Math.round((met / required) * 100) : 0

  return (
    <div className="habit-month">
      <div className="cal-toolbar" style={{ marginBottom: 10 }}>
        <strong>{format(cursor, 'MMMM yyyy')}</strong>
        <span className="subtitle" style={{ marginLeft: 8 }}>{met}/{required} days · {rate}%</span>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft size={16} /></button>
        <button className="icon-btn" onClick={() => setCursor(new Date())} title="This month" style={{ width: 'auto', padding: '0 8px', fontSize: 12 }}>Today</button>
        <button className="icon-btn" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight size={16} /></button>
      </div>

      <div className="track-grid">
        {weekdays.map((d, i) => <div key={i} className="track-weekday">{d}</div>)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const val = habit.log[key] ?? 0
          const ratio = Math.min(1, val / habit.goal)
          const done = val >= habit.goal
          const required = isRequiredDay(habit, day)
          const past = !isAfter(day, new Date())
          const missed = past && !isToday(day) && required && val === 0
          const outside = !isSameMonth(day, cursor)
          const tip = `${key}: ${val}/${habit.goal} ${habit.unit}${!required ? ' (rest day)' : missed ? ' — missed' : ''}`
          return (
            <button
              key={key}
              className={cx('track-day habit-day', outside && 'muted', isToday(day) && 'today', missed && 'missed', !required && 'rest')}
              title={tip}
              onClick={() => incrementHabit(habit.id, key, done ? -val : 1)}
              style={ratio > 0 ? { background: habit.color, opacity: outside ? 0.4 : 0.25 + ratio * 0.75, color: '#fff', borderColor: habit.color } : undefined}
            >
              <span className="track-daynum" style={ratio > 0 ? { color: '#fff' } : undefined}>{format(day, 'd')}</span>
              <span className="habit-day-val">
                {done ? (
                  habit.goal > 1 ? val : <Check size={11} strokeWidth={3} />
                ) : val > 0 ? `${val}/${habit.goal}` : ''}
              </span>
            </button>
          )
        })}
      </div>

      <div className="track-legend">
        <span className="track-legend-item"><span className="track-dot done" style={{ background: habit.color, borderColor: habit.color }} /> done</span>
        <span className="track-legend-item"><span className="track-dot missed" /> missed</span>
        <span className="track-legend-item">tap a day to log · goal {habit.goal} {habit.unit}/day</span>
      </div>
    </div>
  )
}
