import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { useUI } from './store/useUI'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import AddTaskBar from './components/AddTaskBar'
import TaskListView from './components/TaskListView'
import TaskDetail from './components/TaskDetail'
import KanbanView from './components/KanbanView'
import CalendarView from './components/CalendarView'
import HabitView from './components/HabitView'
import PomodoroView from './components/PomodoroView'
import StatsView from './components/StatsView'
import SettingsView from './components/SettingsView'
import MatrixView from './components/MatrixView'
import Toasts from './components/Toasts'
import { useReminderEngine } from './hooks/useReminderEngine'
import { useNativeNotifications } from './hooks/useNativeNotifications'
import { useSync } from './hooks/useSync'

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  const accent = useStore((s) => s.settings.accent)

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.setAttribute('data-theme', dark ? 'dark' : 'light')
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    const soft = accent + '1f'
    document.documentElement.style.setProperty('--accent-soft', soft)
  }, [accent])
}

export default function App() {
  useTheme()
  useReminderEngine()
  useNativeNotifications()
  useSync()
  const selection = useUI((s) => s.selection)
  const view = useUI((s) => s.view)
  const selectedTaskId = useUI((s) => s.selectedTaskId)
  const lists = useStore((s) => s.lists)

  const renderTaskArea = () => {
    if (selection.kind === 'list') {
      const list = lists.find((l) => l.id === selection.id)
      if (list && view === 'kanban' && list.kanban) return <KanbanView list={list} />
    }
    if (view === 'calendar') return <CalendarView />
    return (
      <>
        <AddTaskBar />
        <TaskListView />
      </>
    )
  }

  const renderMain = () => {
    switch (selection.kind) {
      case 'matrix':
        return <MatrixView />
      case 'habits':
        return <HabitView />
      case 'focus':
        return <PomodoroView />
      case 'stats':
        return <StatsView />
      case 'settings':
        return <SettingsView />
      default:
        return renderTaskArea()
    }
  }

  const showDetail = selectedTaskId && ['list', 'tag', 'smart', 'filter', 'matrix'].includes(selection.kind)
  const isBoardOrCal =
    selection.kind === 'matrix' ||
    view === 'calendar' ||
    (selection.kind === 'list' && view === 'kanban' && lists.find((l) => l.id === selection.id)?.kanban)

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">
          <div className="panel" style={isBoardOrCal ? { overflow: 'hidden' } : undefined}>
            {renderMain()}
          </div>
          {showDetail && <TaskDetail />}
        </div>
      </div>
      <Toasts />
    </div>
  )
}
