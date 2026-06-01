import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import type { Priority } from '../types'
import { todayISO, format, addDays } from '../lib/date'

/** Parse quick-add syntax: "#tag" tags, "!1/!2/!3" priority, date keywords. */
function parseQuickAdd(raw: string) {
  let text = raw
  const tags: string[] = []
  let priority: Priority = 0
  let dueDate: string | null = null

  text = text.replace(/#(\w[\w-]*)/g, (_, tag) => {
    tags.push(tag)
    return ''
  })
  const pm = text.match(/!([1-3])/)
  if (pm) {
    priority = Number(pm[1]) as Priority
    text = text.replace(/!([1-3])/, '')
  }
  if (/\btoday\b/i.test(text)) {
    dueDate = todayISO()
    text = text.replace(/\btoday\b/i, '')
  } else if (/\btomorrow\b/i.test(text)) {
    dueDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    text = text.replace(/\btomorrow\b/i, '')
  } else if (/\bnext week\b/i.test(text)) {
    dueDate = format(addDays(new Date(), 7), 'yyyy-MM-dd')
    text = text.replace(/\bnext week\b/i, '')
  }
  return { title: text.replace(/\s+/g, ' ').trim(), tags, priority, dueDate }
}

export default function AddTaskBar() {
  const [value, setValue] = useState('')
  const addTask = useStore((s) => s.addTask)
  const addTag = useStore((s) => s.addTag)
  const lists = useStore((s) => s.lists)
  const selection = useUI((s) => s.selection)
  const selectTask = useUI((s) => s.selectTask)

  // figure out which list & defaults the new task should belong to
  const defaults = () => {
    let listId = 'inbox'
    let dueDate: string | null = null
    let priority: Priority = 0
    const tags: string[] = []
    if (selection.kind === 'list') listId = selection.id
    if (selection.kind === 'tag') tags.push(selection.id)
    if (selection.kind === 'smart') {
      if (selection.id === 'today') dueDate = todayISO()
      if (selection.id === 'tomorrow') dueDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      if (selection.id === 'high') priority = 3
    }
    return { listId, dueDate, priority, tags }
  }

  const submit = () => {
    if (!value.trim()) return
    const parsed = parseQuickAdd(value)
    const d = defaults()
    const tags = Array.from(new Set([...d.tags, ...parsed.tags]))
    tags.forEach((t) => addTag(t))
    const list = lists.find((l) => l.id === d.listId)
    const id = addTask({
      title: parsed.title || 'Untitled task',
      listId: d.listId,
      dueDate: parsed.dueDate ?? d.dueDate,
      priority: parsed.priority || d.priority,
      tags,
      columnId: list?.kanban ? list.columns[0]?.id ?? null : null,
    })
    selectTask(id)
    setValue('')
  }

  return (
    <div className="add-bar">
      <Plus size={18} style={{ color: 'var(--accent)' }} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder='Add a task — try "Submit report tomorrow #work !2"'
      />
      <span className="hint">Enter ↵</span>
    </div>
  )
}
