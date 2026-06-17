import { useState } from 'react'
import {
  Menu,
  List as ListIcon,
  LayoutGrid,
  Calendar as CalIcon,
  ArrowUpDown,
  Group as GroupIcon,
  MoreHorizontal,
  Check,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useBackDismiss } from '../lib/backHandler'
import { cx } from '../lib/utils'
import type { SortMode, ViewMode, GroupMode } from '../types'

const SMART_TITLES: Record<string, { title: string; emoji: string }> = {
  today: { title: 'Today', emoji: '☀️' },
  overdue: { title: 'Overdue', emoji: '⏰' },
  tomorrow: { title: 'Tomorrow', emoji: '🌅' },
  next7: { title: 'Next 7 Days', emoji: '🗓️' },
  inbox: { title: 'Inbox', emoji: '📥' },
  all: { title: 'All Tasks', emoji: '🗂️' },
  notes: { title: 'Notes', emoji: '📝' },
  completed: { title: 'Completed', emoji: '✅' },
  high: { title: 'High Priority', emoji: '🔥' },
}

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Date created' },
]

const GROUPS: { value: GroupMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'list', label: 'List' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'tag', label: 'Tag' },
]

export default function Header() {
  const { selection, view, setView, sort, setSort, group, setGroup, toggleSidebar, setSelection } = useUI()
  const lists = useStore((s) => s.lists)
  const filters = useStore((s) => s.filters)
  const tasks = useStore((s) => s.tasks)
  const showCompleted = useStore((s) => s.settings.showCompleted)
  const updateSettings = useStore((s) => s.updateSettings)
  const [sortOpen, setSortOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  useBackDismiss(sortOpen || groupOpen || moreOpen, () => {
    setSortOpen(false)
    setGroupOpen(false)
    setMoreOpen(false)
  })

  let title = ''
  let emoji = ''
  let subtitle = ''
  let isTaskView = false

  if (selection.kind === 'smart') {
    const meta = SMART_TITLES[selection.id]
    title = meta?.title ?? 'Tasks'
    emoji = meta?.emoji ?? ''
    isTaskView = true
    const count = tasks.filter((t) => !t.completed).length
    if (selection.id === 'today') subtitle = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    else if (selection.id === 'all') subtitle = `${count} active`
  } else if (selection.kind === 'list') {
    const list = lists.find((l) => l.id === selection.id)
    title = list?.name ?? 'List'
    emoji = list?.emoji ?? ''
    isTaskView = true
  } else if (selection.kind === 'tag') {
    title = `#${selection.id}`
    isTaskView = true
  } else if (selection.kind === 'filter') {
    const f = filters.find((x) => x.id === selection.id)
    title = f?.name ?? 'Smart List'
    emoji = f?.emoji ?? '🔎'
    isTaskView = true
  } else {
    const map: Record<string, string> = { matrix: 'Eisenhower Matrix', habits: 'Habits', focus: 'Focus', stats: 'Statistics', settings: 'Settings' }
    emoji = selection.kind === 'matrix' ? '🎯' : ''
    title = map[selection.kind] ?? ''
  }

  const currentList = selection.kind === 'list' ? lists.find((l) => l.id === selection.id) : null
  const views: { v: ViewMode; icon: typeof ListIcon; label: string }[] = [
    { v: 'list', icon: ListIcon, label: 'List' },
    ...(currentList?.kanban ? [{ v: 'kanban' as ViewMode, icon: LayoutGrid, label: 'Board' }] : []),
    { v: 'calendar', icon: CalIcon, label: 'Calendar' },
  ]

  return (
    <div className="header">
      <button className="icon-btn menu-toggle" onClick={toggleSidebar} aria-label="Menu">
        <Menu size={20} />
      </button>
      <h1>
        {emoji && <span>{emoji}</span>}
        <span className="htitle">{title}</span>
      </h1>
      {subtitle && <span className="subtitle">{subtitle}</span>}
      <div className="header-spacer" />

      {isTaskView && (
        <>
          <div className="view-switch">
            {views.map(({ v, icon: Icon, label }) => (
              <button key={v} className={cx(view === v && 'active')} onClick={() => setView(v)} title={label}>
                <Icon size={15} />
              </button>
            ))}
          </div>

          {view === 'list' && (
            <>
              <div style={{ position: 'relative' }}>
                <button className={cx('icon-btn', group !== 'none' && 'active')} style={group !== 'none' ? { color: 'var(--accent)' } : undefined} onClick={() => setGroupOpen((o) => !o)} title="Group by">
                  <GroupIcon size={17} />
                </button>
                {groupOpen && (
                  <>
                    <div className="modal-backdrop" style={{ background: 'transparent' }} onClick={() => setGroupOpen(false)} />
                    <div className="ctx-menu" style={{ right: 0, top: 40, position: 'absolute' }}>
                      <div style={{ padding: '4px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>GROUP BY</div>
                      {GROUPS.map((g) => (
                        <button key={g.value} className="ctx-item" onClick={() => { setGroup(g.value); setGroupOpen(false) }}>
                          {g.label}
                          {group === g.value && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button className="icon-btn" onClick={() => setSortOpen((o) => !o)} title="Sort">
                  <ArrowUpDown size={17} />
                </button>
                {sortOpen && (
                  <>
                    <div className="modal-backdrop" style={{ background: 'transparent' }} onClick={() => setSortOpen(false)} />
                    <div className="ctx-menu" style={{ right: 0, top: 40, position: 'absolute' }}>
                      <div style={{ padding: '4px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>SORT BY</div>
                      {SORTS.map((s) => (
                        <button key={s.value} className="ctx-item" onClick={() => { setSort(s.value); setSortOpen(false) }}>
                          {s.label}
                          {sort === s.value && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ position: 'relative' }}>
        <button className="icon-btn" title="More" onClick={() => setMoreOpen((o) => !o)}>
          <MoreHorizontal size={18} />
        </button>
        {moreOpen && (
          <>
            <div className="modal-backdrop" style={{ background: 'transparent' }} onClick={() => setMoreOpen(false)} />
            <div className="ctx-menu" style={{ right: 0, top: 40, position: 'absolute' }}>
              {isTaskView && (
                <button
                  className="ctx-item"
                  onClick={() => { updateSettings({ showCompleted: !showCompleted }); setMoreOpen(false) }}
                >
                  {showCompleted ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showCompleted ? 'Hide completed' : 'Show completed'}
                </button>
              )}
              <button
                className="ctx-item"
                onClick={() => { setSelection({ kind: 'settings' }); setMoreOpen(false) }}
              >
                <SettingsIcon size={15} /> Settings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
