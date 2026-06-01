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
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays as addDaysFn,
  subDays,
  format,
  parseISO,
} from 'date-fns'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { cx } from '../lib/utils'
import type { Task } from '../types'

type CalView = 'month' | 'week' | 'day' | 'agenda'

export default function CalendarView() {
  const tasks = useStore((s) => s.tasks)
  const weekStartsMonday = useStore((s) => s.settings.weekStartsMonday)
  const selectTask = useUI((s) => s.selectTask)
  const [cursor, setCursor] = useState(new Date())
  const [calView, setCalView] = useState<CalView>('month')

  const weekOpts = { weekStartsOn: (weekStartsMonday ? 1 : 0) as 0 | 1 }

  const tasksByDay: Record<string, Task[]> = {}
  tasks.forEach((t) => {
    if (!t.dueDate) return
    const key = format(parseISO(t.dueDate), 'yyyy-MM-dd')
    ;(tasksByDay[key] ??= []).push(t)
  })
  const dayTasks = (d: Date) => (tasksByDay[format(d, 'yyyy-MM-dd')] ?? []).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

  const move = (dir: 1 | -1) => {
    if (calView === 'month') setCursor((c) => (dir === 1 ? addMonths(c, 1) : subMonths(c, 1)))
    else if (calView === 'week') setCursor((c) => (dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)))
    else if (calView === 'day') setCursor((c) => (dir === 1 ? addDaysFn(c, 1) : subDays(c, 1)))
  }

  const titleText =
    calView === 'month'
      ? format(cursor, 'MMMM yyyy')
      : calView === 'week'
        ? `${format(startOfWeek(cursor, weekOpts), 'MMM d')} – ${format(endOfWeek(cursor, weekOpts), 'MMM d')}`
        : calView === 'day'
          ? format(cursor, 'EEEE, MMM d')
          : 'Agenda'

  return (
    <div className="calendar">
      <div className="cal-toolbar">
        <h2>{titleText}</h2>
        <div style={{ flex: 1 }} />
        <div className="view-switch">
          {(['month', 'week', 'day', 'agenda'] as CalView[]).map((v) => (
            <button key={v} className={cx(calView === v && 'active')} onClick={() => setCalView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => setCursor(new Date())}>Today</button>
        {calView !== 'agenda' && (
          <>
            <button className="icon-btn" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
            <button className="icon-btn" onClick={() => move(1)}><ChevronRight size={18} /></button>
          </>
        )}
      </div>

      {calView === 'month' && (
        <MonthGrid cursor={cursor} weekOpts={weekOpts} weekStartsMonday={weekStartsMonday} dayTasks={dayTasks} onPick={selectTask} />
      )}
      {calView === 'week' && (
        <WeekGrid cursor={cursor} weekOpts={weekOpts} weekStartsMonday={weekStartsMonday} dayTasks={dayTasks} onPick={selectTask} />
      )}
      {calView === 'day' && <DayList cursor={cursor} dayTasks={dayTasks} onPick={selectTask} />}
      {calView === 'agenda' && <AgendaList tasks={tasks} onPick={selectTask} />}
    </div>
  )
}

const PRIO_COLORS = ['var(--accent)', '#4772fa', 'var(--amber)', 'var(--red)']

function EventChip({ t, onPick }: { t: Task; onPick: (id: string) => void }) {
  return (
    <div
      className={cx('cal-event', t.completed && 'done')}
      style={{ borderLeftColor: PRIO_COLORS[t.priority] }}
      onClick={() => onPick(t.id)}
      title={t.title}
    >
      {t.hasTime && t.dueDate ? `${format(parseISO(t.dueDate), 'HH:mm')} ` : ''}
      {t.title}
    </div>
  )
}

function MonthGrid({ cursor, weekOpts, weekStartsMonday, dayTasks, onPick }: {
  cursor: Date
  weekOpts: { weekStartsOn: 0 | 1 }
  weekStartsMonday: boolean
  dayTasks: (d: Date) => Task[]
  onPick: (id: string) => void
}) {
  const gridStart = startOfWeek(startOfMonth(cursor), weekOpts)
  const gridEnd = endOfWeek(endOfMonth(cursor), weekOpts)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const weekdays = weekStartsMonday
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="cal-grid">
      {weekdays.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
      {days.map((day) => {
        const list = dayTasks(day)
        return (
          <div key={day.toISOString()} className={cx('cal-day', !isSameMonth(day, cursor) && 'muted', isToday(day) && 'today')}>
            <span className="daynum">{format(day, 'd')}</span>
            {list.slice(0, 3).map((t) => <EventChip key={t.id} t={t} onPick={onPick} />)}
            {list.length > 3 && <div className="cal-more">+{list.length - 3} more</div>}
          </div>
        )
      })}
    </div>
  )
}

function WeekGrid({ cursor, weekOpts, dayTasks, onPick }: {
  cursor: Date
  weekOpts: { weekStartsOn: 0 | 1 }
  weekStartsMonday: boolean
  dayTasks: (d: Date) => Task[]
  onPick: (id: string) => void
}) {
  const start = startOfWeek(cursor, weekOpts)
  const days = eachDayOfInterval({ start, end: endOfWeek(cursor, weekOpts) })
  return (
    <div className="cal-grid" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
      {days.map((day) => (
        <div key={day.toISOString()} className="cal-weekday" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>{format(day, 'EEE')}</span>
          <span className={cx('daynum', isToday(day) && 'today')} style={{ alignSelf: 'center' }}>{format(day, 'd')}</span>
        </div>
      ))}
      {days.map((day) => {
        const list = dayTasks(day)
        return (
          <div key={'c' + day.toISOString()} className={cx('cal-day', isToday(day) && 'today')} style={{ minHeight: 200 }}>
            {list.map((t) => <EventChip key={t.id} t={t} onPick={onPick} />)}
            {list.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
          </div>
        )
      })}
    </div>
  )
}

function DayList({ cursor, dayTasks, onPick }: { cursor: Date; dayTasks: (d: Date) => Task[]; onPick: (id: string) => void }) {
  const list = dayTasks(cursor)
  return (
    <div className="scroll-page" style={{ padding: '8px 4px' }}>
      {list.length === 0 ? (
        <div className="empty" style={{ height: 240 }}>
          <span className="emoji">📅</span>
          <div>Nothing scheduled for this day.</div>
        </div>
      ) : (
        list.map((t) => (
          <div key={t.id} className="task-item" onClick={() => onPick(t.id)}>
            <span className="dot" style={{ background: PRIO_COLORS[t.priority], marginTop: 6 }} />
            <div className="task-body">
              <div className={cx('task-title', t.completed && 'done')}>{t.title}</div>
              {t.hasTime && t.dueDate && (
                <div className="task-meta"><span className="meta-chip">{format(parseISO(t.dueDate), 'HH:mm')}</span></div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function AgendaList({ tasks, onPick }: { tasks: Task[]; onPick: (id: string) => void }) {
  const scheduled = tasks
    .filter((t) => t.dueDate && !t.completed)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

  const groups: { label: string; items: Task[] }[] = []
  const byDay = new Map<string, Task[]>()
  scheduled.forEach((t) => {
    const key = format(parseISO(t.dueDate!), 'yyyy-MM-dd')
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(t)
  })
  Array.from(byDay.keys()).sort().forEach((key) => {
    const d = parseISO(key)
    const label = isToday(d) ? 'Today' : isSameDay(d, addDaysFn(new Date(), 1)) ? 'Tomorrow' : format(d, 'EEEE, MMM d')
    groups.push({ label, items: byDay.get(key)! })
  })

  if (groups.length === 0) {
    return (
      <div className="empty" style={{ height: 280 }}>
        <span className="emoji">🗒️</span>
        <div>No upcoming scheduled tasks.</div>
      </div>
    )
  }

  return (
    <div className="scroll-page" style={{ padding: '8px 4px' }}>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="task-group-title">{g.label}</div>
          {g.items.map((t) => (
            <div key={t.id} className="task-item" onClick={() => onPick(t.id)}>
              <span className="dot" style={{ background: PRIO_COLORS[t.priority], marginTop: 6 }} />
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                {t.hasTime && t.dueDate && (
                  <div className="task-meta"><span className="meta-chip">{format(parseISO(t.dueDate), 'HH:mm')}</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
