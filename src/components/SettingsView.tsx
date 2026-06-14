import { useEffect, useRef, useState } from 'react'
import { Download, Upload, RotateCcw, Sun, Moon, Monitor, Bell, BellRing, Cloud, CloudOff, RefreshCw, UploadCloud, DownloadCloud, Lock, ShieldCheck } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useToasts } from '../store/useToasts'
import { useLock } from '../store/useLock'
import LockSetup from './LockSetup'
import { useSyncStatus } from '../store/useSyncStatus'
import { snapshot, pushServer, fetchServer, setLocalVersion } from '../lib/sync'
import { cx, LIST_COLORS } from '../lib/utils'
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  showNotification,
  chime,
} from '../lib/notifications'
import {
  isNative,
  getNativePermission,
  requestNativePermission,
  syncNativeReminders,
  sendNativeTest,
  type NativePerm,
} from '../lib/nativeNotifications'
import type { AppState } from '../types'

export default function SettingsView() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetData = useStore((s) => s.resetData)
  const importData = useStore((s) => s.importData)
  const pushToast = useToasts((s) => s.push)
  const fileRef = useRef<HTMLInputElement>(null)
  const [perm, setPerm] = useState<NotificationPermission>(notificationPermission())
  const native = isNative()
  const [nativePerm, setNativePerm] = useState<NativePerm>('prompt')
  const insecure = !native && typeof window !== 'undefined' && !window.isSecureContext
  const host = typeof window !== 'undefined' ? window.location.host : ''

  const lock = useLock()
  const [showLockSetup, setShowLockSetup] = useState(false)
  const disableLock = () => {
    if (window.confirm('Turn off the app lock?')) lock.disable()
  }

  useEffect(() => {
    if (native) getNativePermission().then(setNativePerm)
  }, [native])

  const enableNotifications = async () => {
    if (native) {
      const ok = await requestNativePermission()
      setNativePerm(ok ? 'granted' : 'denied')
      if (ok) {
        const { tasks, habits } = useStore.getState()
        await syncNativeReminders(tasks, habits)
        pushToast({ title: 'Notifications enabled', body: 'Reminders will alert you even when the app is closed.', emoji: '🔔' })
      }
      return
    }
    const p = await requestNotificationPermission()
    setPerm(p)
    if (p === 'granted') showNotification('🔔 Notifications enabled', 'TickFlow will alert you when reminders are due.')
  }

  const syncStatus = useSyncStatus((s) => s.status)
  const lastSync = useSyncStatus((s) => s.lastSync)
  const setSyncStatus = useSyncStatus((s) => s.setStatus)

  const forceUpload = async () => {
    setSyncStatus('syncing')
    const v = await pushServer(snapshot())
    if (v != null) {
      setLocalVersion(v)
      setSyncStatus('synced')
      pushToast({ title: 'Uploaded', body: 'This device is now the source on the server.', emoji: '☁️' })
    } else {
      setSyncStatus('offline')
      pushToast({ title: 'No sync server', body: 'Start the app via the sync server to enable.', emoji: '⚠️' })
    }
  }

  const forceDownload = async () => {
    setSyncStatus('syncing')
    const res = await fetchServer()
    if (res?.state) {
      importData(res.state)
      setLocalVersion(res.version)
      setSyncStatus('synced')
      pushToast({ title: 'Downloaded', body: 'Pulled the latest data from the server.', emoji: '☁️' })
    } else {
      setSyncStatus('offline')
      pushToast({ title: 'Nothing to download', body: 'No server or no data on it yet.', emoji: '⚠️' })
    }
  }

  const sendTest = async () => {
    chime()
    pushToast({ title: 'Test reminder', body: 'This is what a reminder looks like.', emoji: '✅' })
    if (native) {
      const err = await sendNativeTest()
      if (err) pushToast({ title: 'Notification failed', body: `Couldn't post to the tray — ${err}.`, emoji: '⚠️' })
    } else {
      showNotification('✅ Test reminder', 'This is what a reminder looks like.')
    }
  }

  const exportData = () => {
    const state = useStore.getState()
    const data: AppState = {
      tasks: state.tasks,
      lists: state.lists,
      folders: state.folders,
      tags: state.tags,
      filters: state.filters,
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

      <Group title="Notifications & Reminders">
        <div className="switch">
          <div>
            <div style={{ fontWeight: 600 }}>{native ? 'Notifications' : 'Browser notifications'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {native
                ? nativePerm === 'granted'
                  ? '✅ Enabled — reminders fire even when the app is closed'
                  : nativePerm === 'denied'
                    ? '🚫 Blocked — allow notifications for TickFlow in Android settings'
                    : 'Allow notifications to get reminders even when the app is closed'
                : insecure
                  ? `🔒 This address (http://${host}) is insecure, so the browser blocks notifications. Open the app over its https:// address (the sync server now uses HTTPS) and accept the one-time certificate warning.`
                  : !notificationsSupported()
                    ? 'Not supported in this browser'
                    : perm === 'granted'
                      ? '✅ Enabled — reminders will pop up while TickFlow is open'
                      : perm === 'denied'
                        ? '🚫 Blocked — enable notifications for this site in your browser settings'
                        : 'Allow notifications to get reminder pop-ups'}
            </div>
          </div>
          {(native ? nativePerm !== 'granted' : perm !== 'granted') && (
            <button
              className="btn primary"
              onClick={enableNotifications}
              disabled={native ? nativePerm === 'denied' : insecure || !notificationsSupported() || perm === 'denied'}
            >
              <Bell size={15} /> Enable
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={sendTest}><BellRing size={15} /> Send test reminder</button>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {native
            ? 'Reminders are scheduled on your device, so task reminders and habit times alert you even when TickFlow is closed. The in-app toast + chime also play while the app is open.'
            : 'OS notifications need a secure page (localhost or https), so they only pop up while a TickFlow tab is open. The in-app toast + chime always work.'}
        </div>
      </Group>

      <Group title="App Lock">
        <div className="switch">
          <div>
            <div style={{ fontWeight: 600 }}>
              {lock.enabled ? <><ShieldCheck size={14} style={{ verticalAlign: -2, color: 'var(--green, #36b37e)' }} /> Lock is on</> : 'Lock TickFlow'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {lock.enabled
                ? `Protected with a ${lock.type === 'pin' ? 'PIN' : 'pattern'}. Asks to unlock when you open the app.`
                : 'Require a PIN or pattern to open the app.'}
            </div>
          </div>
          {!lock.enabled && (
            <button className="btn primary" onClick={() => setShowLockSetup(true)}>
              <Lock size={15} /> Set up
            </button>
          )}
        </div>
        {lock.enabled && (
          <>
            <Toggle
              label="Lock when returning to the app"
              value={lock.lockOnResume}
              onChange={(v) => lock.setLockOnResume(v)}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn" onClick={() => setShowLockSetup(true)}>Change PIN / pattern</button>
              <button className="btn" onClick={disableLock}>Turn off lock</button>
            </div>
          </>
        )}
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

      <Group title="Sync (multi-device)">
        <div className="switch">
          <div>
            <div style={{ fontWeight: 600 }}>
              {syncStatus === 'synced' && '✅ Synced'}
              {syncStatus === 'syncing' && '🔄 Syncing…'}
              {syncStatus === 'offline' && '⚠️ Sync server unreachable'}
              {syncStatus === 'disabled' && 'Not in sync mode'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {syncStatus === 'disabled'
                ? 'Open the app from the sync server (run-server) to share one dataset across all devices on your network.'
                : syncStatus === 'offline'
                  ? "Can't reach /api/state — is the sync server still running?"
                  : lastSync
                    ? `Last synced ${new Date(lastSync).toLocaleTimeString()}`
                    : 'Connected to the sync server.'}
            </div>
          </div>
          <span style={{ color: syncStatus === 'disabled' || syncStatus === 'offline' ? 'var(--text-muted)' : 'var(--green)' }}>
            {syncStatus === 'syncing' ? <RefreshCw size={20} /> : syncStatus === 'disabled' || syncStatus === 'offline' ? <CloudOff size={20} /> : <Cloud size={20} />}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={forceUpload}><UploadCloud size={15} /> Upload this device → server</button>
          <button className="btn" onClick={forceDownload}><DownloadCloud size={15} /> Download server → this device</button>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Edits sync automatically (last change wins). The first device to connect seeds the server —
          use <strong>Upload</strong> to force this device's data to become the shared copy, or
          <strong> Download</strong> to overwrite this device with the server's copy.
        </div>
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

      {showLockSetup && <LockSetup onClose={() => setShowLockSetup(false)} />}
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
