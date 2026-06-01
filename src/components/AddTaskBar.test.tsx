import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddTaskBar from './AddTaskBar'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import type { Settings, TaskList } from '../types'
import { todayISO, format, addDays } from '../lib/date'

const settings: Settings = {
  theme: 'system', accent: '#4772fa', focusMinutes: 25, shortBreak: 5, longBreak: 15,
  longBreakEvery: 4, weekStartsMonday: true, showCompleted: false,
}
const inbox: TaskList = { id: 'inbox', name: 'Inbox', color: '#000', emoji: '📥', folderId: null, kanban: false, columns: [], order: 0 }

beforeEach(() => {
  useStore.setState({ tasks: [], lists: [inbox], folders: [], tags: [], filters: [], habits: [], pomodoros: [], settings })
  useUI.setState({ selection: { kind: 'list', id: 'inbox' }, selectedTaskId: null, search: '' })
})

describe('AddTaskBar quick-add parsing', () => {
  it('parses tags, priority and date keywords from the input', async () => {
    const user = userEvent.setup()
    render(<AddTaskBar />)
    const input = screen.getByPlaceholderText(/Add a task/i)
    await user.type(input, 'Write report tomorrow #work !2{Enter}')

    const tasks = useStore.getState().tasks
    expect(tasks.length).toBe(1)
    const t = tasks[0]
    expect(t.title).toBe('Write report')
    expect(t.tags).toContain('work')
    expect(t.priority).toBe(2)
    expect(t.dueDate).toBe(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
    // the tag should also be registered globally
    expect(useStore.getState().tags.some((x) => x.name === 'work')).toBe(true)
  })

  it('clears the input after adding', async () => {
    const user = userEvent.setup()
    render(<AddTaskBar />)
    const input = screen.getByPlaceholderText(/Add a task/i) as HTMLInputElement
    await user.type(input, 'Simple task{Enter}')
    expect(input.value).toBe('')
  })

  it('defaults due date to today inside the Today smart list', async () => {
    useUI.setState({ selection: { kind: 'smart', id: 'today' } })
    const user = userEvent.setup()
    render(<AddTaskBar />)
    await user.type(screen.getByPlaceholderText(/Add a task/i), 'Plain{Enter}')
    expect(useStore.getState().tasks[0].dueDate).toBe(todayISO())
  })
})
