import { useState } from 'react'
import { Plus, Minus, Trash2, Flame, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cx, HABIT_EMOJIS, LIST_COLORS } from '../lib/utils'
import { todayISO, format, addDays } from '../lib/date'
import Modal from './Modal'
import type { Habit } from '../types'

function streak(habit: Habit): number {
  let count = 0
  for (let i = 0; i < 365; i++) {
    const key = format(addDays(new Date(), -i), 'yyyy-MM-dd')
    if ((habit.log[key] ?? 0) >= habit.goal) count++
    else if (i === 0) continue // today not done yet shouldn't break streak
    else break
  }
  return count
}

export default function HabitView() {
  const habits = useStore((s) => s.habits)
  const { incrementHabit, deleteHabit } = useStore()
  const [adding, setAdding] = useState(false)
  const today = todayISO()
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

      {active.map((h) => {
        const todayVal = h.log[today] ?? 0
        const done = todayVal >= h.goal
        const st = streak(h)
        return (
          <div className="habit-card" key={h.id}>
            <div className="habit-head">
              <div className="habit-emoji" style={{ background: h.color + '22', color: h.color }}>
                {h.emoji}
              </div>
              <div>
                <div className="habit-name">{h.name}</div>
                <div className="habit-streak">
                  <Flame size={12} style={{ verticalAlign: -1, color: st > 0 ? 'var(--amber)' : undefined }} /> {st} day streak · goal {h.goal} {h.unit}/day
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
            <Heatmap habit={h} />
          </div>
        )
      })}

      {adding && <HabitModal onClose={() => setAdding(false)} />}
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

  const save = () => {
    if (!name.trim()) return
    addHabit({ name, emoji, color, goal, unit })
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
