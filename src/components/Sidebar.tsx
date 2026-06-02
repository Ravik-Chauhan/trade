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
  LayoutDashboard,
  Filter as FilterIcon,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  StickyNote,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI, type Selection } from '../store/useUI'
import { countForSelection } from '../lib/selectors'
import { cx, LIST_COLORS, PRIORITY_META } from '../lib/utils'
import Modal from './Modal'
import type { TaskList, SmartFilter, Priority, DueFilter } from '../types'

const SMART = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'tomorrow', label: 'Tomorrow', icon: Sunrise },
  { id: 'next7', label: 'Next 7 Days', icon: CalendarDays },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'high', label: 'High Priority', icon: AlertOctagon },
  { id: 'all', label: 'All Tasks', icon: Layers },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
] as const

export default function Sidebar() {
  const { lists, tags, tasks, folders, filters, updateFolder, addFolder } = useStore()
  const selection = useUI((s) => s.selection)
  const setSelection = useUI((s) => s.setSelection)
  const setSidebar = useUI((s) => s.setSidebar)
  const search = useUI((s) => s.search)
  const setSearch = useUI((s) => s.setSearch)
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const [editing, setEditing] = useState<TaskList | 'new' | null>(null)
  const [editingFilter, setEditingFilter] = useState<SmartFilter | 'new' | null>(null)

  const isActive = (sel: Selection) =>
    selection.kind === sel.kind && ('id' in selection && 'id' in sel ? selection.id === sel.id : true)

  const pick = (sel: Selection) => {
    setSelection(sel)
    setSidebar(false)
  }

  const sortedLists = [...lists].sort((a, b) => a.order - b.order)
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order)
  const looseLists = sortedLists.filter((l) => !l.folderId || !folders.some((f) => f.id === l.folderId))

  const renderList = (list: TaskList) => (
    <ListNavItem
      key={list.id}
      list={list}
      active={isActive({ kind: 'list', id: list.id })}
      count={countForSelection(tasks, { kind: 'list', id: list.id })}
      onClick={() => pick({ kind: 'list', id: list.id })}
      onEdit={() => setEditing(list)}
    />
  )

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
              if (e.target.value && !['smart', 'list', 'tag', 'filter'].includes(selection.kind)) {
                pick({ kind: 'smart', id: 'all' })
              }
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
                <span className="nav-icon"><Icon size={17} /></span>
                <span className="nav-label">{s.label}</span>
                {count > 0 && <span className="nav-count">{count}</span>}
              </button>
            )
          })}

          {filters.length > 0 && (
            <>
              <div className="nav-section-title">
                Smart Lists
                <button onClick={() => setEditingFilter('new')} title="New smart list">
                  <Plus size={15} />
                </button>
              </div>
              {filters.map((f) => (
                <button
                  key={f.id}
                  className={cx('nav-item', isActive({ kind: 'filter', id: f.id }) && 'active')}
                  onClick={() => pick({ kind: 'filter', id: f.id })}
                >
                  <span className="nav-emoji">{f.emoji}</span>
                  <span className="nav-label">{f.name}</span>
                  <span
                    className="icon-btn"
                    style={{ width: 22, height: 22 }}
                    onClick={(e) => { e.stopPropagation(); setEditingFilter(f) }}
                  >
                    <Pencil size={13} />
                  </span>
                  <span className="nav-count">
                    {countForSelection(tasks, { kind: 'filter', id: f.id }, filters)}
                  </span>
                </button>
              ))}
            </>
          )}
          {filters.length === 0 && (
            <button className="nav-item" style={{ color: 'var(--text-muted)' }} onClick={() => setEditingFilter('new')}>
              <span className="nav-icon"><FilterIcon size={16} /></span>
              <span className="nav-label">New Smart List…</span>
            </button>
          )}

          <div className="nav-section-title">
            Lists
            <span style={{ display: 'flex', gap: 2 }}>
              <button onClick={() => { const n = prompt('Folder name'); if (n) addFolder(n) }} title="New folder">
                <FolderPlus size={15} />
              </button>
              <button onClick={() => setEditing('new')} title="New list">
                <Plus size={15} />
              </button>
            </span>
          </div>

          {sortedFolders.map((folder) => {
            const inFolder = sortedLists.filter((l) => l.folderId === folder.id)
            return (
              <div key={folder.id}>
                <button
                  className="nav-item"
                  onClick={() => updateFolder(folder.id, { collapsed: !folder.collapsed })}
                >
                  <span className="nav-icon">{folder.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
                  <FolderIcon size={15} style={{ color: 'var(--text-muted)' }} />
                  <span className="nav-label" style={{ marginLeft: 6 }}>{folder.name}</span>
                  <span className="nav-count">{inFolder.length}</span>
                </button>
                {!folder.collapsed && (
                  <div style={{ marginLeft: 14 }}>{inFolder.map(renderList)}</div>
                )}
              </div>
            )
          })}
          {looseLists.map(renderList)}

          {tags.length > 0 && (
            <>
              <div className="nav-section-title">Tags</div>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={cx('nav-item', isActive({ kind: 'tag', id: tag.name }) && 'active')}
                  onClick={() => pick({ kind: 'tag', id: tag.name })}
                >
                  <span className="nav-icon" style={{ color: tag.color }}><Hash size={16} /></span>
                  <span className="nav-label">{tag.name}</span>
                  <span className="nav-count">{countForSelection(tasks, { kind: 'tag', id: tag.name })}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <NavMini icon={LayoutDashboard} label="Matrix" active={selection.kind === 'matrix'} onClick={() => pick({ kind: 'matrix' })} />
          <NavMini icon={Target} label="Habits" active={selection.kind === 'habits'} onClick={() => pick({ kind: 'habits' })} />
          <NavMini icon={Timer} label="Focus" active={selection.kind === 'focus'} onClick={() => pick({ kind: 'focus' })} />
          <NavMini icon={BarChart3} label="Stats" active={selection.kind === 'stats'} onClick={() => pick({ kind: 'stats' })} />
          <NavMini icon={SettingsIcon} label="Settings" active={selection.kind === 'settings'} onClick={() => pick({ kind: 'settings' })} />
        </div>
      </aside>

      {sidebarOpen && <div className="scrim" onClick={() => setSidebar(false)} />}

      {editing && <ListModal list={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {editingFilter && (
        <FilterModal filter={editingFilter === 'new' ? null : editingFilter} onClose={() => setEditingFilter(null)} />
      )}
    </>
  )
}

function NavMini({ icon: Icon, label, active, onClick }: { icon: typeof Target; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={cx('nav-item', active && 'active')} onClick={onClick} title={label} style={{ flex: 1, justifyContent: 'center' }}>
      <span className="nav-icon"><Icon size={18} /></span>
    </button>
  )
}

function ListNavItem({ list, active, count, onClick, onEdit }: { list: TaskList; active: boolean; count: number; onClick: () => void; onEdit: () => void }) {
  return (
    <button className={cx('nav-item', active && 'active')} onClick={onClick}>
      <span className="nav-emoji">{list.emoji}</span>
      <span className="nav-label">{list.name}</span>
      {list.kanban && (
        <span className="nav-icon" style={{ color: 'var(--text-muted)' }}><LayoutGrid size={13} /></span>
      )}
      <span className="icon-btn" style={{ width: 22, height: 22 }} onClick={(e) => { e.stopPropagation(); onEdit() }}>
        <Pencil size={13} />
      </span>
      {count > 0 && <span className="nav-count">{count}</span>}
    </button>
  )
}

const LIST_EMOJIS = ['📋', '💼', '🌿', '🛒', '🏠', '🎯', '💡', '📚', '✈️', '💰', '❤️', '🎨', '🏋️', '🍔']

function ListModal({ list, onClose }: { list: TaskList | null; onClose: () => void }) {
  const { addList, updateList, deleteList, folders } = useStore()
  const [name, setName] = useState(list?.name ?? '')
  const [emoji, setEmoji] = useState(list?.emoji ?? '📋')
  const [color, setColor] = useState(list?.color ?? LIST_COLORS[0])
  const [kanban, setKanban] = useState(list?.kanban ?? false)
  const [folderId, setFolderId] = useState<string | null>(list?.folderId ?? null)

  const save = () => {
    if (list) updateList(list.id, { name, emoji, color, kanban, folderId })
    else addList(name, { emoji, color, kanban, folderId })
    onClose()
  }

  return (
    <Modal
      title={list ? 'Edit List' : 'New List'}
      onClose={onClose}
      footer={
        <>
          {list && list.id !== 'inbox' && (
            <button className="danger-btn" style={{ marginRight: 'auto' }} onClick={() => { deleteList(list.id); onClose() }}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>Save</button>
        </>
      }
    >
      <div>
        <label className="form-label">Name</label>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()} />
      </div>
      <div>
        <label className="form-label">Icon</label>
        <div className="emoji-row">
          {LIST_EMOJIS.map((e) => (
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
      {folders.length > 0 && (
        <div>
          <label className="form-label">Folder</label>
          <select className="input" value={folderId ?? ''} onChange={(e) => setFolderId(e.target.value || null)}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}
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

const FILTER_EMOJIS = ['🔎', '🔥', '⭐', '⚡', '📌', '🎯', '🏷️', '⏰']
const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Due today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'next7', label: 'Next 7 days' },
  { value: 'nodate', label: 'No date' },
]

function FilterModal({ filter, onClose }: { filter: SmartFilter | null; onClose: () => void }) {
  const { addFilter, updateFilter, deleteFilter, lists, tags } = useStore()
  const [name, setName] = useState(filter?.name ?? '')
  const [emoji, setEmoji] = useState(filter?.emoji ?? '🔎')
  const [color, setColor] = useState(filter?.color ?? LIST_COLORS[0])
  const [listIds, setListIds] = useState<string[]>(filter?.listIds ?? [])
  const [selTags, setSelTags] = useState<string[]>(filter?.tags ?? [])
  const [priorities, setPriorities] = useState<Priority[]>(filter?.priorities ?? [])
  const [due, setDue] = useState<DueFilter>(filter?.due ?? 'any')
  const [includeCompleted, setIncludeCompleted] = useState(filter?.includeCompleted ?? false)

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const save = () => {
    const payload = { name, emoji, color, listIds, tags: selTags, priorities, due, includeCompleted }
    if (filter) updateFilter(filter.id, payload)
    else addFilter(payload)
    onClose()
  }

  return (
    <Modal
      title={filter ? 'Edit Smart List' : 'New Smart List'}
      onClose={onClose}
      footer={
        <>
          {filter && (
            <button className="danger-btn" style={{ marginRight: 'auto' }} onClick={() => { deleteFilter(filter.id); onClose() }}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>Save</button>
        </>
      }
    >
      <div>
        <label className="form-label">Name</label>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work — Urgent" />
      </div>
      <div>
        <label className="form-label">Icon</label>
        <div className="emoji-row">
          {FILTER_EMOJIS.map((e) => (
            <button key={e} className={cx('emoji-pick', emoji === e && 'active')} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">Due</label>
        <select className="input" value={due} onChange={(e) => setDue(e.target.value as DueFilter)}>
          {DUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Priority (any of)</label>
        <div className="priority-picker">
          {PRIORITY_META.map((p) => (
            <button key={p.value} className={cx('pill', priorities.includes(p.value as Priority) && 'active')} onClick={() => toggle(priorities, p.value as Priority, setPriorities)}>
              <span className="dot" style={{ background: p.color }} /> {p.label}
            </button>
          ))}
        </div>
      </div>
      {lists.length > 0 && (
        <div>
          <label className="form-label">Lists (any of)</label>
          <div className="tag-picker">
            {lists.map((l) => (
              <button key={l.id} className={cx('pill', listIds.includes(l.id) && 'active')} onClick={() => toggle(listIds, l.id, setListIds)}>
                {l.emoji} {l.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <label className="form-label">Tags (any of)</label>
          <div className="tag-picker">
            {tags.map((t) => (
              <button key={t.id} className={cx('pill', selTags.includes(t.name) && 'active')} onClick={() => toggle(selTags, t.name, setSelTags)}>
                <span className="dot" style={{ background: t.color }} /> {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="form-label">Color</label>
        <div className="color-row">
          {LIST_COLORS.map((c) => (
            <button key={c} className={cx('color-swatch', color === c && 'active')} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <div className="switch">
        <span style={{ fontWeight: 500 }}>Include completed tasks</span>
        <button className={cx('toggle', includeCompleted && 'on')} onClick={() => setIncludeCompleted(!includeCompleted)} />
      </div>
    </Modal>
  )
}
