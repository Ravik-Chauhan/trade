export type Priority = 0 | 1 | 2 | 3 // none, low, medium, high

export type ViewMode = 'list' | 'kanban' | 'calendar'

export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'yearly'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  notes: string
  listId: string
  completed: boolean
  completedAt: string | null
  priority: Priority
  dueDate: string | null // ISO date (yyyy-mm-dd) or full ISO if timed
  startDate: string | null
  hasTime: boolean
  tags: string[]
  subtasks: Subtask[]
  repeat: RepeatRule
  reminder: string | null // ISO datetime
  pinned: boolean
  order: number
  createdAt: string
  // kanban column when a list uses board layout
  columnId?: string | null
}

export interface TaskList {
  id: string
  name: string
  color: string
  emoji: string
  folderId: string | null
  kanban: boolean
  columns: { id: string; name: string }[]
  order: number
}

export interface Folder {
  id: string
  name: string
  order: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface HabitLog {
  // map of yyyy-mm-dd -> value (count of completions that day)
  [date: string]: number
}

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  goal: number // target per day
  unit: string
  /** which weekdays it is active on (0=Sun..6=Sat); empty = every day */
  days: number[]
  archived: boolean
  createdAt: string
  log: HabitLog
}

export interface PomodoroSession {
  id: string
  taskId: string | null
  startedAt: string
  minutes: number
  type: 'focus' | 'break'
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  accent: string
  focusMinutes: number
  shortBreak: number
  longBreak: number
  longBreakEvery: number
  weekStartsMonday: boolean
  showCompleted: boolean
}

export type SortMode = 'manual' | 'dueDate' | 'priority' | 'title' | 'createdAt'

export type SmartListId =
  | 'today'
  | 'tomorrow'
  | 'next7'
  | 'inbox'
  | 'all'
  | 'completed'
  | 'high'

export interface AppState {
  tasks: Task[]
  lists: TaskList[]
  folders: Folder[]
  tags: Tag[]
  habits: Habit[]
  pomodoros: PomodoroSession[]
  settings: Settings
}
