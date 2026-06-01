import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cx } from '../lib/utils'
import { todayISO } from '../lib/date'

type Mode = 'focus' | 'short' | 'long'
type TimerMode = 'pomodoro' | 'stopwatch'
type Noise = 'off' | 'white' | 'brown' | 'pink'

const NOISES: { id: Noise; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'white', label: 'White' },
  { id: 'pink', label: 'Pink' },
  { id: 'brown', label: 'Brown' },
]

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

  const [timerMode, setTimerMode] = useState<TimerMode>('pomodoro')
  const [mode, setMode] = useState<Mode>('focus')
  const [remaining, setRemaining] = useState(durations.focus)
  const [elapsed, setElapsed] = useState(0) // stopwatch seconds
  const [running, setRunning] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [completedFocus, setCompletedFocus] = useState(0)
  const [noise, setNoise] = useState<Noise>('off')
  const intervalRef = useRef<number | null>(null)
  const audioRef = useRef<{ ctx: AudioContext; src: AudioBufferSourceNode; gain: GainNode } | null>(null)

  const total = durations[mode]

  const switchMode = (m: Mode) => {
    setMode(m)
    setRemaining(durations[m])
    setRunning(false)
  }

  useEffect(() => {
    if (!running && timerMode === 'pomodoro') setRemaining(durations[mode])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focusMinutes, settings.shortBreak, settings.longBreak])

  // main ticking interval
  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      if (timerMode === 'stopwatch') {
        setElapsed((e) => e + 1)
      } else {
        setRemaining((r) => {
          if (r <= 1) {
            finishPomodoro()
            return 0
          }
          return r - 1
        })
      }
    }, 1000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, timerMode])

  // clean up audio on unmount
  useEffect(() => () => stopNoise(), [])

  const beep = () => {
    try {
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
      /* ignore */
    }
  }

  const finishPomodoro = () => {
    setRunning(false)
    beep()
    if (mode === 'focus') {
      logPomodoro({ taskId, startedAt: new Date().toISOString(), minutes: settings.focusMinutes, type: 'focus' })
      const next = completedFocus + 1
      setCompletedFocus(next)
      switchMode(next % settings.longBreakEvery === 0 ? 'long' : 'short')
    } else {
      switchMode('focus')
    }
  }

  const stopStopwatch = () => {
    setRunning(false)
    const minutes = Math.round(elapsed / 60)
    if (minutes >= 1) {
      logPomodoro({ taskId, startedAt: new Date().toISOString(), minutes, type: 'focus' })
      setCompletedFocus((c) => c + 1)
    }
    setElapsed(0)
    beep()
  }

  // ---- white noise generation ----
  function stopNoise() {
    if (audioRef.current) {
      try {
        audioRef.current.src.stop()
        audioRef.current.ctx.close()
      } catch {
        /* ignore */
      }
      audioRef.current = null
    }
  }

  function startNoise(type: Noise) {
    stopNoise()
    if (type === 'off') return
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const bufferSize = 2 * ctx.sampleRate
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      } else if (type === 'brown') {
        let last = 0
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1
          last = (last + 0.02 * w) / 1.02
          data[i] = last * 3.5
        }
      } else {
        // pink-ish noise (Paul Kellet approximation)
        let b0 = 0, b1 = 0, b2 = 0
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1
          b0 = 0.99765 * b0 + w * 0.099046
          b1 = 0.963 * b1 + w * 0.2965164
          b2 = 0.57 * b2 + w * 1.0526913
          data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25
        }
      }
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0.25
      src.connect(gain)
      gain.connect(ctx.destination)
      src.start()
      audioRef.current = { ctx, src, gain }
    } catch {
      /* ignore audio errors */
    }
  }

  const pickNoise = (n: Noise) => {
    setNoise(n)
    startNoise(n)
  }

  const fmt = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  const displaySecs = timerMode === 'stopwatch' ? elapsed : remaining
  const progress = timerMode === 'stopwatch' ? (elapsed % 60) / 60 : 1 - remaining / total
  const R = 130
  const C = 2 * Math.PI * R

  const todayFocus = pomodoros.filter((p) => p.startedAt.slice(0, 10) === todayISO() && p.type === 'focus')
  const todayCount = todayFocus.length
  const todayMinutes = todayFocus.reduce((sum, p) => sum + p.minutes, 0)
  const activeTasks = tasks.filter((t) => !t.completed)
  const ringColor = timerMode === 'stopwatch' ? '#9b51e0' : mode === 'focus' ? 'var(--accent)' : 'var(--green)'

  const onPrimary = () => {
    if (timerMode === 'stopwatch' && running) stopStopwatch()
    else setRunning((r) => !r)
  }

  return (
    <div className="pomodoro">
      <div className="pomo-modes">
        <button className={cx(timerMode === 'pomodoro' && 'active')} onClick={() => { setTimerMode('pomodoro'); setRunning(false) }}>Pomodoro</button>
        <button className={cx(timerMode === 'stopwatch' && 'active')} onClick={() => { setTimerMode('stopwatch'); setRunning(false); setElapsed(0) }}>Stopwatch</button>
      </div>

      {timerMode === 'pomodoro' && (
        <div className="pomo-modes">
          <button className={cx(mode === 'focus' && 'active')} onClick={() => switchMode('focus')}>Focus</button>
          <button className={cx(mode === 'short' && 'active')} onClick={() => switchMode('short')}>Short Break</button>
          <button className={cx(mode === 'long' && 'active')} onClick={() => switchMode('long')}>Long Break</button>
        </div>
      )}

      <div className="pomo-ring">
        <svg width="280" height="280" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r={R} fill="none" stroke="var(--border)" strokeWidth="12" />
          <circle
            cx="140" cy="140" r={R} fill="none" stroke={ringColor} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 140 140)"
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="pomo-time">
          <div className="big">{fmt(displaySecs)}</div>
          <div className="lbl">{timerMode === 'stopwatch' ? 'Stopwatch' : mode === 'focus' ? 'Focus' : 'Break'}</div>
        </div>
      </div>

      {(timerMode === 'stopwatch' || mode === 'focus') && (
        <select className="input" style={{ maxWidth: 320 }} value={taskId ?? ''} onChange={(e) => setTaskId(e.target.value || null)}>
          <option value="">No task selected (free focus)</option>
          {activeTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      )}

      <div className="pomo-controls">
        <button className="btn lg primary" onClick={onPrimary}>
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? (timerMode === 'stopwatch' ? 'Stop & Log' : 'Pause') : 'Start'}
        </button>
        {timerMode === 'pomodoro' && (
          <>
            <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={() => switchMode(mode)} title="Reset"><RotateCcw size={18} /></button>
            <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={finishPomodoro} title="Skip"><SkipForward size={18} /></button>
          </>
        )}
        {timerMode === 'stopwatch' && (
          <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={() => { setRunning(false); setElapsed(0) }} title="Reset"><RotateCcw size={18} /></button>
        )}
      </div>

      <div className="pomo-modes" title="Ambient sound">
        {NOISES.map((n) => (
          <button key={n.id} className={cx(noise === n.id && 'active')} onClick={() => pickNoise(n.id)}>
            {n.id === 'off' ? <VolumeX size={14} /> : <Volume2 size={14} />} {n.label}
          </button>
        ))}
      </div>

      <div className="pomo-stat-row">
        <div className="pomo-stat"><div className="num">{todayCount}</div><div className="lbl">Sessions today</div></div>
        <div className="pomo-stat"><div className="num">{todayMinutes}</div><div className="lbl">Focus minutes</div></div>
        <div className="pomo-stat"><div className="num">{completedFocus}</div><div className="lbl">This streak</div></div>
      </div>
    </div>
  )
}
