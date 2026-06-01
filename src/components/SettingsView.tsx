import { useRef } from 'react'
import { Download, Upload, RotateCcw, Sun, Moon, Monitor } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cx, LIST_COLORS } from '../lib/utils'
import type { AppState } from '../types'

export default function SettingsView() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetData = useStore((s) => s.resetData)
  const importData = useStore((s) => s.importData)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const state = useStore.getState()
    const data: AppState = {
      tasks: state.tasks,
      lists: state.lists,
      folders: state.folders,
      tags: state.tags,
      habits: state.habits,
      pomodoros: state.pomodoros,
      settings: state.settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickflow-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as AppState
        if (data.tasks && data.lists) importData(data)
      } catch {
        alert('Invalid backup file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="scroll-page" style={{ maxWidth: 640 }}>
      <div className="section-head">
        <div>
          <h2>Settings</h2>
          <div className="page-intro">Personalize TickFlow to fit your workflow</div>
        </div>
      </div>

      <Group title="Appearance">
        <Row label="Theme">
          <div className="view-switch">
            {([['light', Sun], ['dark', Moon], ['system', Monitor]] as const).map(([t, Icon]) => (
              <button key={t} className={cx(settings.theme === t && 'active')} onClick={() => updateSettings({ theme: t })}>
                <Icon size={15} /> {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Accent color">
          <div className="color-row">
            {LIST_COLORS.map((c) => (
              <button key={c} className={cx('color-swatch', settings.accent === c && 'active')} style={{ background: c }} onClick={() => updateSettings({ accent: c })} />
            ))}
          </div>
        </Row>
      </Group>

      <Group title="Tasks">
        <Toggle label="Show completed tasks" value={settings.showCompleted} onChange={(v) => updateSettings({ showCompleted: v })} />
        <Toggle label="Week starts on Monday" value={settings.weekStartsMonday} onChange={(v) => updateSettings({ weekStartsMonday: v })} />
      </Group>

      <Group title="Pomodoro Timer">
        <NumRow label="Focus length (min)" value={settings.focusMinutes} onChange={(v) => updateSettings({ focusMinutes: v })} />
        <NumRow label="Short break (min)" value={settings.shortBreak} onChange={(v) => updateSettings({ shortBreak: v })} />
        <NumRow label="Long break (min)" value={settings.longBreak} onChange={(v) => updateSettings({ longBreak: v })} />
        <NumRow label="Long break every N sessions" value={settings.longBreakEvery} onChange={(v) => updateSettings({ longBreakEvery: v })} />
      </Group>

      <Group title="Data">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportData}><Download size={15} /> Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
          <button
            className="btn"
            style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
            onClick={() => {
              if (confirm('Reset all data to the demo state? This cannot be undone.')) resetData()
            }}
          >
            <RotateCcw size={15} /> Reset to demo data
          </button>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 10 }}>
          All your data is stored locally in this browser. Export regularly to keep a backup.
        </div>
      </Group>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stat-card" style={{ marginTop: 18 }}>
      <div className="detail-label">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="switch">
      <span style={{ fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label}>
      <button className={cx('toggle', value && 'on')} onClick={() => onChange(!value)} />
    </Row>
  )
}

function NumRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <input
        className="input"
        type="number"
        min={1}
        style={{ width: 90 }}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
      />
    </Row>
  )
}
