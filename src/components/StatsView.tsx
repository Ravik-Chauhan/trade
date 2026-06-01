import { useStore } from '../store/useStore'
import { format, addDays } from '../lib/date'

export default function StatsView() {
  const tasks = useStore((s) => s.tasks)
  const habits = useStore((s) => s.habits)
  const pomodoros = useStore((s) => s.pomodoros)

  const completed = tasks.filter((t) => t.completed)
  const active = tasks.filter((t) => !t.completed)
  const overdue = active.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < format(new Date(), 'yyyy-MM-dd'))
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0

  // last 7 days completed counts
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(new Date(), -(6 - i))
    const key = format(day, 'yyyy-MM-dd')
    const count = completed.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === key).length
    return { label: format(day, 'EEE'), count }
  })
  const maxCount = Math.max(1, ...last7.map((d) => d.count))

  const totalFocusMin = pomodoros.filter((p) => p.type === 'focus').reduce((s, p) => s + p.minutes, 0)
  const habitDoneToday = habits.filter((h) => (h.log[format(new Date(), 'yyyy-MM-dd')] ?? 0) >= h.goal).length

  return (
    <div className="scroll-page">
      <div className="section-head">
        <div>
          <h2>Statistics</h2>
          <div className="page-intro">Your productivity at a glance</div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat big={String(completed.length)} label="Tasks completed" />
        <Stat big={String(active.length)} label="Active tasks" />
        <Stat big={`${completionRate}%`} label="Completion rate" />
        <Stat big={String(overdue.length)} label="Overdue" />
        <Stat big={String(totalFocusMin)} label="Focus minutes" />
        <Stat big={`${habitDoneToday}/${habits.length}`} label="Habits done today" />
      </div>

      <div className="section-head">
        <h2>Completed — last 7 days</h2>
      </div>
      <div className="stat-card" style={{ marginTop: 14 }}>
        <div className="bar-chart">
          {last7.map((d) => (
            <div className="bar-col" key={d.label}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{d.count || ''}</div>
              <div className="bar" style={{ height: `${(d.count / maxCount) * 100}%` }} />
              <div className="bar-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="stat-card">
      <div className="big">{big}</div>
      <div className="lbl">{label}</div>
    </div>
  )
}
