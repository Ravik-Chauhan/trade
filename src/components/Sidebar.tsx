import { useState } from 'react'
import {
  CalendarDays,
  Inbox,
  Layers,
  Sun,
  Sunrise,
  AlertOctagon,
  CheckCircle2,
  Hash,
  Plus,
  Target,
  Timer,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Trash2,
  Pencil,
  LayoutGrid,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI, type Selection } from '../store/useUI'
import { countForSelection } from '../lib/selectors'
import { cx, LIST_COLORS } from '../lib/utils'
import Modal from './Modal'
import type { TaskList } from '../types'

const SMART = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'tomorrow', label: 'Tomorrow', icon: Sunrise },
  { id: 'next7', label: 'Next 7 Days', icon: CalendarDays },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'high', label: 'High Priority', icon: AlertOctagon },
  { id: 'all', label: 'All Tasks', icon: Layers },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
] as const

export default function Sidebar() {
  const { lists, tags, tasks } = useStore()
  const selection = useUI((s) => s.selection)
  const setSelection = useUI((s) => s.setSelection)
  const setSidebar = useUI((s) => s.setSidebar)
  const search = useUI((s) => s.search)
  const setSearch = useUI((s) => s.setSearch)
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const [editing, setEditing] = useState<TaskList | 'new' | null>(null)

  const isActive = (sel: Selection) =>
    selection.kind === sel.kind &&
    ('id' in selection && 'id' in sel ? selection.id === sel.id : true)

  const pick = (sel: Selection) => {
    setSelection(sel)
    setSidebar(false)
  }

  const sortedLists = [...lists].sort((a, b) => a.order - b.order)

  return (
    <>
      <aside className={cx('sidebar', sidebarOpen && 'open')}>
        <div className="brand">
          <span className="logo">
            <CheckCircle2 size={18} />
          </span>
          TickFlow
          <span className="badge">Premium</span>
        </div>

        <div className="sidebar-search">
          <Search size={15} />
          <input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (e.target.value && selection.kind !== 'smart') pick({ kind: 'smart', id: 'all' })
            }}
          />
        </div>

        <div className="sidebar-scroll">
          {SMART.map((s) => {
            const Icon = s.icon
            const count = s.id === 'completed' ? 0 : countForSelection(tasks, { kind: 'smart', id: s.id })
            return (
              <button
                key={s.id}
                className={cx('nav-item', isActive({ kind: 'smart', id: s.id }) && 'active')}
                onClick={() => pick({ kind: 'smart', id: s.id })}
              >
                <span className="nav-icon">
                  <Icon size={17} />
                </span>
                <span className="nav-label">{s.label}</span>
                {count > 0 && <span className="nav-count">{count}</span>}
              </button>
            )
          })}

          <div className="nav-section-title">
            Lists
            <button onClick={() => setEditing('new')} title="New list">
              <Plus size={15} />
            </button>
          </div>
          {sortedLists.map((list) => (
            <ListNavItem
              key={list.id}
              list={list}
              active={isActive({ kind: 'list', id: list.id })}
              count={countForSelection(tasks, { kind: 'list', id: list.id })}
              onClick={() => pick({ kind: 'list', id: list.id })}
              onEdit={() => setEditing(list)}
            />
          ))}

          {tags.length > 0 && (
            <>
              <div className="nav-section-title">Tags</div>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={cx('nav-item', isActive({ kind: 'tag', id: tag.name }) && 'active')}
                  onClick={() => pick({ kind: 'tag', id: tag.name })}
                >
                  <span className="nav-icon" style={{ color: tag.color }}>
                    <Hash size={16} />
                  </span>
                  <span className="nav-label">{tag.name}</span>
                  <span className="nav-count">
                    {countForSelection(tasks, { kind: 'tag', id: tag.name })}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <NavMini icon={Target} label="Habits" active={selection.kind === 'habits'} onClick={() => pick({ kind: 'habits' })} />
          <NavMini icon={Timer} label="Focus" active={selection.kind === 'focus'} onClick={() => pick({ kind: 'focus' })} />
          <NavMini icon={BarChart3} label="Stats" active={selection.kind === 'stats'} onClick={() => pick({ kind: 'stats' })} />
          <NavMini icon={SettingsIcon} label="Settings" active={selection.kind === 'settings'} onClick={() => pick({ kind: 'settings' })} />
        </div>
      </aside>

      {sidebarOpen && <div className="scrim" onClick={() => setSidebar(false)} />}

      {editing && (
        <ListModal
          list={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function NavMini({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Target
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={cx('nav-item', active && 'active')} onClick={onClick} title={label} style={{ flex: 1, justifyContent: 'center' }}>
      <span className="nav-icon">
        <Icon size={18} />
      </span>
    </button>
  )
}

function ListNavItem({
  list,
  active,
  count,
  onClick,
  onEdit,
}: {
  list: TaskList
  active: boolean
  count: number
  onClick: () => void
  onEdit: () => void
}) {
  return (
    <button className={cx('nav-item', active && 'active')} onClick={onClick}>
      <span className="nav-emoji">{list.emoji}</span>
      <span className="nav-label">{list.name}</span>
      {list.kanban && (
        <span className="nav-icon" style={{ color: 'var(--text-muted)' }}>
          <LayoutGrid size={13} />
        </span>
      )}
      <span
        className="icon-btn"
        style={{ width: 22, height: 22 }}
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
      >
        <Pencil size={13} />
      </span>
      {count > 0 && <span className="nav-count">{count}</span>}
    </button>
  )
}

function ListModal({ list, onClose }: { list: TaskList | null; onClose: () => void }) {
  const { addList, updateList, deleteList } = useStore()
  const [name, setName] = useState(list?.name ?? '')
  const [emoji, setEmoji] = useState(list?.emoji ?? '📋')
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[0])
  const [kanban, setKanban] = useState(list?.kanban ?? false)

  const EMOJIS = ['📋', '💼', '🌿', '🛒', '🏠', '🎯', '💡', '📚', '✈️', '💰', '❤️', '🎨', '🏋️', '🍔']

  const save = () => {
    if (list) updateList(list.id, { name, emoji, color, kanban })
    else addList(name, { emoji, color, kanban })
    onClose()
  }

  return (
    <Modal
      title={list ? 'Edit List' : 'New List'}
      onClose={onClose}
      footer={
        <>
          {list && list.id !== 'inbox' && (
            <button
              className="danger-btn"
              style={{ marginRight: 'auto' }}
              onClick={() => {
                deleteList(list.id)
                onClose()
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>
            Save
          </button>
        </>
      }
    >
      <div>
        <label className="form-label">Name</label>
        <input
          className="input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="List name"
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()}
        />
      </div>
      <div>
        <label className="form-label">Icon</label>
        <div className="emoji-row">
          {EMOJIS.map((e) => (
            <button key={e} className={cx('emoji-pick', emoji === e && 'active')} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">Color</label>
        <div className="color-row">
          {LIST_COLORS.map((c) => (
            <button
              key={c}
              className={cx('color-swatch', color === c && 'active')}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="switch">
        <div>
          <div style={{ fontWeight: 600 }}>Board (Kanban) view</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Organize tasks into columns</div>
        </div>
        <button className={cx('toggle', kanban && 'on')} onClick={() => setKanban(!kanban)} />
      </div>
    </Modal>
  )
}
