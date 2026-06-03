import { useState } from 'react'
import { Plus, Minus, Trash2, Flame, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cx, HABIT_EMOJIS, LIST_COLORS } from '../lib/utils'
import { todayISO, format, addDays } from '../lib/date'
import Modal from './Modal'
import HabitMonthCalendar from './HabitMonthCalendar'
import type { Habit } from '../types'

/** A habit is "required" on a given weekday based on its frequency. */
function isRequiredDay(habit: Habit, date: Date): boolean {
  if (habit.freq.type === 'weekly') return true
  if (habit.freq.days.length === 0) return true
  return habit.freq.days.includes(date.getDay())
}

function streak(habit: Habit): number {
  let count = 0
  for (let i = 0; i < 365; i++) {
    const date = addDays(new Date(), -i)
    const key = format(date, 'yyyy-MM-dd')
    const met = (habit.log[key] ?? 0) >= habit.goal
    if (met) {
      count++
    } else if (i === 0) {
      continue // today not logged yet shouldn't break the streak
    } else if (habit.freq.type === 'daily' && !isRequiredDay(habit, date)) {
      continue // skip non-required days without breaking
    } else {
      break
    }
  }
  return count
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function freqLabel(habit: Habit): string {
  if (habit.freq.type === 'weekly') return `${habit.freq.timesPerWeek}× per week`
  if (habit.freq.days.length === 0 || habit.freq.days.length === 7) return 'Every day'
  return habit.freq.days
    .slice()
    .sort()
    .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
    .join(', ')
}

export default function HabitView() {
  const habits = useStore((s) => s.habits)
  const [adding, setAdding] = useState(false)
  const active = habits.filter((h) => !h.archived)

  return (
    <div className="scroll-page">
      <div className="section-head">
        <div>
          <h2>Habits</h2>
          <div className="page-intro">Build routines and keep your streaks alive 🔥</div>
        </div>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> New Habit
        </button>
      </div>

      {active.length === 0 && (
        <div className="empty" style={{ height: 240 }}>
          <span className="emoji">🌱</span>
          <div>No habits yet. Create one to start tracking.</div>
        </div>
      )}

      {active.map((h) => <HabitCard key={h.id} habit={h} />)}

      {adding && <HabitModal onClose={() => setAdding(false)} />}
    </div>
  )
}

function HabitCard({ habit: h }: { habit: Habit }) {
  const { incrementHabit, deleteHabit } = useStore()
  const [tab, setTab] = useState<'recent' | 'month'>('recent')
  const today = todayISO()
  const todayVal = h.log[today] ?? 0
  const done = todayVal >= h.goal
  const st = streak(h)

  return (
    <div className="habit-card">
      <div className="habit-head">
        <div className="habit-emoji" style={{ background: h.color + '22', color: h.color }}>{h.emoji}</div>
        <div>
          <div className="habit-name">{h.name}</div>
          <div className="habit-streak">
            <Flame size={12} style={{ verticalAlign: -1, color: st > 0 ? 'var(--amber)' : undefined }} /> {st} day streak · {freqLabel(h)} · {h.goal} {h.unit}
            {h.reminderTime && <> · ⏰ {h.reminderTime}</>}
          </div>
        </div>
        <div className="habit-controls">
          <button className="step-btn" onClick={() => incrementHabit(h.id, today, -1)}>
            <Minus size={16} />
          </button>
          <span className="habit-today-val" style={{ color: done ? h.color : undefined }}>
            {done && <Check size={14} style={{ verticalAlign: -2 }} />} {todayVal}/{h.goal}
          </span>
          <button className="step-btn" onClick={() => incrementHabit(h.id, today, 1)}>
            <Plus size={16} />
          </button>
          <button className="icon-btn" onClick={() => deleteHabit(h.id)} title="Delete habit">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="addbar-toggle" style={{ marginBottom: 10 }} role="group" aria-label="History view">
        <button className={cx(tab === 'recent' && 'active')} onClick={() => setTab('recent')}>Recent</button>
        <button className={cx(tab === 'month' && 'active')} onClick={() => setTab('month')}>Month</button>
      </div>

      {tab === 'recent' ? <Heatmap habit={h} /> : <HabitMonthCalendar habit={h} />}
    </div>
  )
}

function Heatmap({ habit }: { habit: Habit }) {
  const cells = Array.from({ length: 40 }, (_, i) => {
    const key = format(addDays(new Date(), -(39 - i)), 'yyyy-MM-dd')
    const val = habit.log[key] ?? 0
    const ratio = Math.min(1, val / habit.goal)
    return { key, ratio }
  })
  return (
    <div className="heatmap" style={{ gridTemplateColumns: 'repeat(40, 1fr)' }}>
      {cells.map((c) => (
        <div
          key={c.key}
          className="heat-cell"
          title={`${c.key}: ${Math.round(c.ratio * 100)}%`}
          style={{ background: c.ratio > 0 ? habit.color : undefined, opacity: c.ratio > 0 ? 0.25 + c.ratio * 0.75 : 1 }}
        />
      ))}
    </div>
  )
}

function HabitModal({ onClose }: { onClose: () => void }) {
  const addHabit = useStore((s) => s.addHabit)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(HABIT_EMOJIS[0])
  const [color, setColor] = useState(LIST_COLORS[0])
  const [goal, setGoal] = useState(1)
  const [unit, setUnit] = useState('time')
  const [freqType, setFreqType] = useState<'daily' | 'weekly'>('daily')
  const [days, setDays] = useState<number[]>([])
  const [timesPerWeek, setTimesPerWeek] = useState(3)
  const [reminderTime, setReminderTime] = useState('')

  const toggleDay = (d: number) => setDays((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]))

  const save = () => {
    if (!name.trim()) return
    addHabit({
      name,
      emoji,
      color,
      goal,
      unit,
      freq: { type: freqType, days, timesPerWeek },
      reminderTime: reminderTime || null,
    })
    onClose()
  }

  return (
    <Modal
      title="New Habit"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>Create</button>
        </>
      }
    >
      <div>
        <label className="form-label">Habit name</label>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 minutes" onKeyDown={(e) => e.key === 'Enter' && save()} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Daily goal</label>
          <input className="input" type="number" min={1} value={goal} onChange={(e) => setGoal(Math.max(1, Number(e.target.value)))} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">Unit</label>
          <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="glasses, mins…" />
        </div>
      </div>
      <div>
        <label className="form-label">Frequency</label>
        <div className="view-switch" style={{ width: 'fit-content' }}>
          <button className={cx(freqType === 'daily' && 'active')} onClick={() => setFreqType('daily')}>Daily</button>
          <button className={cx(freqType === 'weekly' && 'active')} onClick={() => setFreqType('weekly')}>Weekly</button>
        </div>
        {freqType === 'daily' ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAY_LABELS.map((lbl, d) => (
                <button
                  key={d}
                  className={cx('emoji-pick', days.includes(d) && 'active')}
                  style={{ flex: 1 }}
                  onClick={() => toggleDay(d)}
                  title={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
              {days.length === 0 ? 'No days selected = every day' : 'Active on selected weekdays'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <input className="input" type="number" min={1} max={7} style={{ width: 70 }} value={timesPerWeek} onChange={(e) => setTimesPerWeek(Math.min(7, Math.max(1, Number(e.target.value))))} />
            <span style={{ color: 'var(--text-muted)' }}>times per week</span>
          </div>
        )}
      </div>
      <div>
        <label className="form-label">Reminder (optional)</label>
        <input className="input" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
      </div>
      <div>
        <label className="form-label">Icon</label>
        <div className="emoji-row">
          {HABIT_EMOJIS.map((e) => (
            <button key={e} className={cx('emoji-pick', emoji === e && 'active')} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">Color</label>
        <div className="color-row">
          {LIST_COLORS.map((c) => (
            <button key={c} className={cx('color-swatch', color === c && 'active')} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
    </Modal>
  )
}
