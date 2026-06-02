export type Priority = 0 | 1 | 2 | 3 // none, low, medium, high

export type ViewMode = 'list' | 'kanban' | 'calendar'

export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays'

export type GroupMode = 'none' | 'list' | 'priority' | 'dueDate' | 'tag'

/** Structured recurrence supporting intervals and end conditions. */
export interface Recurrence {
  rule: RepeatRule
  interval: number // every N units (daily/weekly/monthly/yearly)
  endType: 'never' | 'onDate' | 'afterCount'
  endDate: string | null
  endCount: number // total occurrences when endType === 'afterCount'
  count: number // occurrences already generated
}

export const NO_RECURRENCE: Recurrence = {
  rule: 'none',
  interval: 1,
  endType: 'never',
  endDate: null,
  endCount: 10,
  count: 0,
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

/** A named daily occurrence for a tracked task, e.g. "Morning" at 08:00. */
export interface TrackingSlot {
  id: string
  label: string
  time: string | null // 'HH:mm' or null
}

export interface Task {
  id: string
  title: string
  notes: string
  kind: 'task' | 'note'
  listId: string
  completed: boolean
  completedAt: string | null
  priority: Priority
  dueDate: string | null // ISO date (yyyy-mm-dd) or full ISO if timed
  startDate: string | null
  hasTime: boolean
  tags: string[]
  subtasks: Subtask[]
  recurrence: Recurrence
  reminders: string[] // multiple reminders (ISO datetimes)
  countdown: boolean // show days-remaining countdown
  // daily multi-slot tracking (e.g. take meds morning & evening)
  trackingEnabled: boolean
  slots: TrackingSlot[]
  completionLog: { [date: string]: string[] } // yyyy-mm-dd -> completed slot ids
  pinned: boolean
  order: number
  createdAt: string
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
  collapsed: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
}

export type DueFilter = 'any' | 'today' | 'overdue' | 'next7' | 'nodate'

/** A user-defined Smart List (saved filter). */
export interface SmartFilter {
  id: string
  name: string
  emoji: string
  color: string
  listIds: string[] // empty = any list
  tags: string[] // empty = any; matches if task has ANY of these
  priorities: Priority[] // empty = any
  due: DueFilter
  includeCompleted: boolean
}

export type HabitFreqType = 'daily' | 'weekly'

export interface HabitFrequency {
  type: HabitFreqType
  days: number[] // for 'daily': specific weekdays (0=Sun..6=Sat); empty = every day
  timesPerWeek: number // for 'weekly'
}

export interface HabitLog {
  [date: string]: number // yyyy-mm-dd -> amount logged that day
}

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  goal: number // target amount per active day
  unit: string
  freq: HabitFrequency
  reminderTime: string | null // 'HH:mm' or null
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
  filters: SmartFilter[]
  habits: Habit[]
  pomodoros: PomodoroSession[]
  settings: Settings
}
