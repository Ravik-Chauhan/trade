import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  format,
  parseISO,
} from 'date-fns'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { cx } from '../lib/utils'

export default function CalendarView() {
  const tasks = useStore((s) => s.tasks)
  const weekStartsMonday = useStore((s) => s.settings.weekStartsMonday)
  const selectTask = useUI((s) => s.selectTask)
  const [cursor, setCursor] = useState(new Date())

  const weekOpts = { weekStartsOn: (weekStartsMonday ? 1 : 0) as 0 | 1 }
  const monthStart = startOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, weekOpts)
  const gridEnd = endOfWeek(endOfMonth(cursor), weekOpts)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const weekdays = weekStartsMonday
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const tasksByDay: Record<string, typeof tasks> = {}
  tasks.forEach((t) => {
    if (!t.dueDate) return
    const key = format(parseISO(t.dueDate), 'yyyy-MM-dd')
    ;(tasksByDay[key] ??= []).push(t)
  })

  return (
    <div className="calendar">
      <div className="cal-toolbar">
        <h2>{format(cursor, 'MMMM yyyy')}</h2>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => setCursor(new Date())}>Today</button>
        <button className="icon-btn" onClick={() => setCursor(subMonths(cursor, 1))}>
          <ChevronLeft size={18} />
        </button>
        <button className="icon-btn" onClick={() => setCursor(addMonths(cursor, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="cal-grid">
        {weekdays.map((d) => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay[key] ?? []
          return (
            <div key={key} className={cx('cal-day', !isSameMonth(day, cursor) && 'muted', isToday(day) && 'today')}>
              <span className="daynum">{format(day, 'd')}</span>
              {dayTasks.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className={cx('cal-event', t.completed && 'done')}
                  style={{ borderLeftColor: ['var(--accent)', '#4772fa', 'var(--amber)', 'var(--red)'][t.priority] }}
                  onClick={() => selectTask(t.id)}
                  title={t.title}
                >
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && <div className="cal-more">+{dayTasks.length - 3} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
