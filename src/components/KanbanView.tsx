import { useState, type DragEvent } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { searchMatch } from '../lib/selectors'
import { cx } from '../lib/utils'
import type { TaskList, Task } from '../types'
import { formatDue } from '../lib/date'

export default function KanbanView({ list }: { list: TaskList }) {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const moveTask = useStore((s) => s.moveTask)
  const settings = useStore((s) => s.settings)
  const search = useUI((s) => s.search)
  const selectTask = useUI((s) => s.selectTask)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropCol, setDropCol] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [text, setText] = useState('')

  const listTasks = tasks.filter(
    (t) => t.listId === list.id && searchMatch(t, search) && (settings.showCompleted || !t.completed)
  )

  const onDrop = (e: DragEvent, colId: string) => {
    e.preventDefault()
    setDropCol(null)
    if (dragId) moveTask(dragId, list.id, colId)
    setDragId(null)
  }

  const submitAdd = (colId: string) => {
    if (text.trim()) {
      const id = addTask({ title: text, listId: list.id, columnId: colId })
      selectTask(id)
    }
    setText('')
    setAdding(null)
  }

  return (
    <div className="kanban">
      {list.columns.map((col) => {
        const colTasks = listTasks
          .filter((t) => (t.columnId ?? list.columns[0]?.id) === col.id)
          .sort((a, b) => a.order - b.order)
        return (
          <div
            key={col.id}
            className={cx('kanban-col', dropCol === col.id && 'drop')}
            onDragOver={(e) => {
              e.preventDefault()
              setDropCol(col.id)
            }}
            onDragLeave={() => setDropCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="kanban-col-head">
              <span>{col.name}</span>
              <span className="count">{colTasks.length}</span>
            </div>
            <div className="kanban-cards">
              {colTasks.map((t) => (
                <Card key={t.id} task={t} onDragStart={() => setDragId(t.id)} onClick={() => selectTask(t.id)} />
              ))}
            </div>
            {adding === col.id ? (
              <div className="kanban-add">
                <input
                  className="input"
                  autoFocus
                  value={text}
                  placeholder="Card title…"
                  onChange={(e) => setText(e.target.value)}
                  onBlur={() => submitAdd(col.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAdd(col.id)
                    if (e.key === 'Escape') {
                      setText('')
                      setAdding(null)
                    }
                  }}
                />
              </div>
            ) : (
              <button className="kanban-add" onClick={() => setAdding(col.id)}>
                <Plus size={15} /> Add card
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Card({ task, onDragStart, onClick }: { task: Task; onDragStart: () => void; onClick: () => void }) {
  return (
    <div
      className={cx('kanban-card', task.completed && 'done')}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onClick={onClick}
    >
      <div className="card-title">{task.title}</div>
      {(task.dueDate || task.tags.length > 0 || task.priority > 0) && (
        <div className="task-meta" style={{ marginTop: 6 }}>
          {task.priority > 0 && (
            <span
              className="dot"
              style={{ background: ['', '#4772fa', 'var(--amber)', 'var(--red)'][task.priority] }}
            />
          )}
          {task.dueDate && <span className="meta-chip">{formatDue(task.dueDate, task.hasTime)}</span>}
          {task.tags.map((tg) => (
            <span key={tg} className="tag-chip">#{tg}</span>
          ))}
        </div>
      )}
    </div>
  )
}
