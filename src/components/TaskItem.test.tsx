import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskItem from './TaskItem'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import type { Settings, TaskList, Task } from '../types'
import { NO_RECURRENCE } from '../types'

const settings: Settings = {
  theme: 'system', accent: '#4772fa', focusMinutes: 25, shortBreak: 5, longBreak: 15,
  longBreakEvery: 4, weekStartsMonday: true, showCompleted: false,
}
const inbox: TaskList = { id: 'inbox', name: 'Inbox', color: '#000', emoji: '📥', folderId: null, kanban: false, columns: [], order: 0 }

function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'My task', notes: '', listId: 'inbox', completed: false, completedAt: null,
    priority: 2, dueDate: null, startDate: null, hasTime: false, tags: ['focus'], subtasks: [],
    recurrence: { ...NO_RECURRENCE }, reminders: [], countdown: false, pinned: false, order: 0,
    createdAt: '2026-01-01T00:00:00', columnId: null, ...over,
  }
}

beforeEach(() => {
  const t = makeTask()
  useStore.setState({ tasks: [t], lists: [inbox], folders: [], tags: [], filters: [], habits: [], pomodoros: [], settings })
  useUI.setState({ selection: { kind: 'list', id: 'inbox' }, selectedTaskId: null })
})

describe('TaskItem', () => {
  it('renders the title and tag', () => {
    render(<TaskItem task={makeTask()} />)
    expect(screen.getByText('My task')).toBeInTheDocument()
    expect(screen.getByText('#focus')).toBeInTheDocument()
  })

  it('toggles completion when the checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskItem task={useStore.getState().tasks[0]} />)
    await user.click(screen.getByLabelText('Toggle complete'))
    expect(useStore.getState().tasks[0].completed).toBe(true)
  })

  it('selects the task when the row is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskItem task={useStore.getState().tasks[0]} />)
    await user.click(screen.getByText('My task'))
    expect(useUI.getState().selectedTaskId).toBe('t1')
  })

  it('toggles the pin via the star button', async () => {
    const user = userEvent.setup()
    render(<TaskItem task={useStore.getState().tasks[0]} />)
    await user.click(screen.getByLabelText('Pin'))
    expect(useStore.getState().tasks[0].pinned).toBe(true)
  })
})
