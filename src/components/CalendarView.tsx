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
import { itemsForDay, overdueItems, type CalItem } from '../lib/calendarItems'
import type { Task } from '../types'

type CalView = 'month' | 'week' | 'day' | 'agenda'

export default function CalendarView() {
  const tasks = useStore((s) => s.tasks)
  const weekStartsMonday = useStore((s) => s.settings.weekStartsMonday)
  const selectTask = useUI((s) => s.selectTask)
  const [cursor, setCursor] = useState(new Date())
  const [calView, setCalView] = useState<CalView>('month')

  const weekOpts = { weekStartsOn: (weekStartsMonday ? 1 : 0) as 0 | 1 }

  const dayItems = (d: Date) => itemsForDay(tasks, format(d, 'yyyy-MM-dd'))

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
        <MonthGrid cursor={cursor} weekOpts={weekOpts} weekStartsMonday={weekStartsMonday} dayItems={dayItems} onPick={selectTask} />
      )}
      {calView === 'week' && (
        <WeekGrid cursor={cursor} weekOpts={weekOpts} weekStartsMonday={weekStartsMonday} dayItems={dayItems} onPick={selectTask} />
      )}
      {calView === 'day' && <DayList cursor={cursor} tasks={tasks} onPick={selectTask} />}
      {calView === 'agenda' && <AgendaList tasks={tasks} onPick={selectTask} />}
    </div>
  )
}

const PRIO_COLORS = ['var(--accent)', '#4772fa', 'var(--amber)', 'var(--red)']

function EventChip({ item, onPick }: { item: CalItem; onPick: (id: string) => void }) {
  return (
    <div
      className={cx('cal-event', item.completed && 'done')}
      style={{ borderLeftColor: PRIO_COLORS[item.priority] }}
      onClick={() => onPick(item.taskId)}
      title={item.title}
    >
      {item.time ? `${item.time} ` : ''}
      {item.title}
    </div>
  )
}

function ItemRow({ item, onPick }: { item: CalItem; onPick: (id: string) => void }) {
  return (
    <div className="task-item" onClick={() => onPick(item.taskId)}>
      <span className="dot" style={{ background: PRIO_COLORS[item.priority], marginTop: 6 }} />
      <div className="task-body">
        <div className={cx('task-title', item.completed && 'done')}>{item.title}</div>
        {item.time && (
          <div className="task-meta"><span className="meta-chip">{item.time}</span></div>
        )}
      </div>
    </div>
  )
}

function MonthGrid({ cursor, weekOpts, weekStartsMonday, dayItems, onPick }: {
  cursor: Date
  weekOpts: { weekStartsOn: 0 | 1 }
  weekStartsMonday: boolean
  dayItems: (d: Date) => CalItem[]
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
        const list = dayItems(day)
        return (
          <div key={day.toISOString()} className={cx('cal-day', !isSameMonth(day, cursor) && 'muted', isToday(day) && 'today')}>
            <span className="daynum">{format(day, 'd')}</span>
            {list.slice(0, 3).map((it) => <EventChip key={it.key} item={it} onPick={onPick} />)}
            {list.length > 3 && <div className="cal-more">+{list.length - 3} more</div>}
          </div>
        )
      })}
    </div>
  )
}

function WeekGrid({ cursor, weekOpts, dayItems, onPick }: {
  cursor: Date
  weekOpts: { weekStartsOn: 0 | 1 }
  weekStartsMonday: boolean
  dayItems: (d: Date) => CalItem[]
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
        const list = dayItems(day)
        return (
          <div key={'c' + day.toISOString()} className={cx('cal-day', isToday(day) && 'today')} style={{ minHeight: 200 }}>
            {list.map((it) => <EventChip key={it.key} item={it} onPick={onPick} />)}
            {list.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
          </div>
        )
      })}
    </div>
  )
}

function DayList({ cursor, tasks, onPick }: { cursor: Date; tasks: Task[]; onPick: (id: string) => void }) {
  const dayKey = format(cursor, 'yyyy-MM-dd')
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const viewingToday = dayKey === todayKey
  const overdue = viewingToday ? overdueItems(tasks, todayKey) : []
  const items = itemsForDay(tasks, dayKey)

  if (overdue.length === 0 && items.length === 0) {
    return (
      <div className="empty" style={{ height: 240 }}>
        <span className="emoji">📅</span>
        <div>Nothing scheduled for this day.</div>
      </div>
    )
  }

  return (
    <div className="scroll-page" style={{ padding: '8px 4px' }}>
      {overdue.length > 0 && (
        <>
          <div className="task-group-title" style={{ color: 'var(--red)' }}>⚠️ Overdue · {overdue.length}</div>
          {overdue.map((it) => <ItemRow key={it.key} item={it} onPick={onPick} />)}
        </>
      )}
      {items.length > 0 && (
        <>
          <div className="task-group-title">{viewingToday ? 'Today' : format(cursor, 'EEE, MMM d')} · {items.length}</div>
          {items.map((it) => <ItemRow key={it.key} item={it} onPick={onPick} />)}
        </>
      )}
    </div>
  )
}

function AgendaList({ tasks, onPick }: { tasks: Task[]; onPick: (id: string) => void }) {
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const overdue = overdueItems(tasks, todayKey)
  const todayItems = itemsForDay(tasks, todayKey)

  // upcoming due-dated tasks after today (tracking recurs daily, so it's only
  // surfaced for Today here to keep the agenda finite)
  const byDay = new Map<string, CalItem[]>()
  tasks.forEach((t) => {
    if (t.kind === 'note' || t.trackingEnabled || t.completed || !t.dueDate) return
    const key = format(parseISO(t.dueDate), 'yyyy-MM-dd')
    if (key <= todayKey) return
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push({
      key: t.id, taskId: t.id, title: t.title,
      time: t.hasTime ? format(parseISO(t.dueDate), 'HH:mm') : null,
      priority: t.priority, completed: false, tracking: false,
    })
  })

  const groups: { label: string; danger?: boolean; items: CalItem[] }[] = []
  if (overdue.length) groups.push({ label: '⚠️ Overdue', danger: true, items: overdue })
  if (todayItems.length) groups.push({ label: 'Today', items: todayItems })
  Array.from(byDay.keys()).sort().forEach((key) => {
    const d = parseISO(key)
    const label = isSameDay(d, addDaysFn(new Date(), 1)) ? 'Tomorrow' : format(d, 'EEEE, MMM d')
    const items = byDay.get(key)!.sort((a, b) => (a.time ?? '~').localeCompare(b.time ?? '~'))
    groups.push({ label, items })
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
          <div className="task-group-title" style={g.danger ? { color: 'var(--red)' } : undefined}>{g.label} · {g.items.length}</div>
          {g.items.map((it) => <ItemRow key={it.key} item={it} onPick={onPick} />)}
        </div>
      ))}
    </div>
  )
}
