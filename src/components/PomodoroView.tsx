import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cx } from '../lib/utils'
import { todayISO } from '../lib/date'

type Mode = 'focus' | 'short' | 'long'

export default function PomodoroView() {
  const settings = useStore((s) => s.settings)
  const tasks = useStore((s) => s.tasks)
  const pomodoros = useStore((s) => s.pomodoros)
  const logPomodoro = useStore((s) => s.logPomodoro)

  const durations: Record<Mode, number> = {
    focus: settings.focusMinutes * 60,
    short: settings.shortBreak * 60,
    long: settings.longBreak * 60,
  }

  const [mode, setMode] = useState<Mode>('focus')
  const [remaining, setRemaining] = useState(durations.focus)
  const [running, setRunning] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [completedFocus, setCompletedFocus] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const total = durations[mode]

  const switchMode = (m: Mode) => {
    setMode(m)
    setRemaining(durations[m])
    setRunning(false)
  }

  // reset remaining when the relevant duration setting changes & not running
  useEffect(() => {
    if (!running) setRemaining(durations[mode])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focusMinutes, settings.shortBreak, settings.longBreak])

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          finish()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode])

  const finish = () => {
    setRunning(false)
    try {
      // gentle audio beep
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch {
      /* ignore audio errors */
    }
    if (mode === 'focus') {
      logPomodoro({ taskId, startedAt: new Date().toISOString(), minutes: settings.focusMinutes, type: 'focus' })
      const next = completedFocus + 1
      setCompletedFocus(next)
      switchMode(next % settings.longBreakEvery === 0 ? 'long' : 'short')
    } else {
      switchMode('focus')
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const progress = 1 - remaining / total
  const R = 130
  const C = 2 * Math.PI * R

  const todayCount = pomodoros.filter((p) => p.startedAt.slice(0, 10) === todayISO() && p.type === 'focus').length
  const todayMinutes = pomodoros
    .filter((p) => p.startedAt.slice(0, 10) === todayISO() && p.type === 'focus')
    .reduce((sum, p) => sum + p.minutes, 0)

  const activeTasks = tasks.filter((t) => !t.completed)
  const ringColor = mode === 'focus' ? 'var(--accent)' : 'var(--green)'

  return (
    <div className="pomodoro">
      <div className="pomo-modes">
        <button className={cx(mode === 'focus' && 'active')} onClick={() => switchMode('focus')}>Focus</button>
        <button className={cx(mode === 'short' && 'active')} onClick={() => switchMode('short')}>Short Break</button>
        <button className={cx(mode === 'long' && 'active')} onClick={() => switchMode('long')}>Long Break</button>
      </div>

      <div className="pomo-ring">
        <svg width="280" height="280" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r={R} fill="none" stroke="var(--border)" strokeWidth="12" />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            transform="rotate(-90 140 140)"
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="pomo-time">
          <div className="big">{mm}:{ss}</div>
          <div className="lbl">{mode === 'focus' ? 'Focus' : 'Break'}</div>
        </div>
      </div>

      {mode === 'focus' && (
        <select
          className="input"
          style={{ maxWidth: 320 }}
          value={taskId ?? ''}
          onChange={(e) => setTaskId(e.target.value || null)}
        >
          <option value="">No task selected (free focus)</option>
          {activeTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      )}

      <div className="pomo-controls">
        <button className="btn lg primary" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={() => switchMode(mode)} title="Reset">
          <RotateCcw size={18} />
        </button>
        <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={finish} title="Skip">
          <SkipForward size={18} />
        </button>
      </div>

      <div className="pomo-stat-row">
        <div className="pomo-stat">
          <div className="num">{todayCount}</div>
          <div className="lbl">Sessions today</div>
        </div>
        <div className="pomo-stat">
          <div className="num">{todayMinutes}</div>
          <div className="lbl">Focus minutes</div>
        </div>
        <div className="pomo-stat">
          <div className="num">{completedFocus}</div>
          <div className="lbl">This streak</div>
        </div>
      </div>
    </div>
  )
}
