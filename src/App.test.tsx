import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useStore } from './store/useStore'
import { useUI } from './store/useUI'

beforeEach(() => {
  useStore.getState().resetData()
  useUI.setState({ selection: { kind: 'smart', id: 'today' }, selectedTaskId: null, search: '', view: 'list' })
})

describe('App smoke test', () => {
  it('renders the brand and the default Today view', () => {
    render(<App />)
    expect(screen.getByText('TickFlow')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Today/i })).toBeInTheDocument()
  })

  it('navigates to the Habits view via the sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTitle('Habits'))
    expect(useUI.getState().selection.kind).toBe('habits')
    expect(screen.getAllByRole('heading', { name: /Habits/i }).length).toBeGreaterThan(0)
  })

  it('navigates to the Eisenhower Matrix', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTitle('Matrix'))
    expect(useUI.getState().selection.kind).toBe('matrix')
  })
})
