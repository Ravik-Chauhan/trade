import type { AppState, Task } from '../types'
import { NO_RECURRENCE } from '../types'
import { uid } from './utils'
import { todayISO, format, addDays } from './date'

export function createSeedState(): AppState {
  const inboxId = 'inbox'
  const workId = uid('list')
  const personalId = uid('list')
  const groceriesId = uid('list')
  const workFolder = uid('folder')

  const today = todayISO()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const in3 = format(addDays(new Date(), 3), 'yyyy-MM-dd')
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')

  let order = 0
  const t = (title: string, listId: string, extra: Partial<Task> = {}): Task => ({
    id: uid('task'),
    title,
    notes: '',
    kind: 'task',
    listId,
    completed: false,
    completedAt: null,
    priority: 0,
    dueDate: null,
    startDate: null,
    hasTime: false,
    tags: [],
    subtasks: [],
    recurrence: { ...NO_RECURRENCE },
    recurrenceLog: [],
    hidePrivate: false,
    reminders: [],
    countdown: false,
    trackingEnabled: false,
    slots: [],
    completionLog: {},
    pinned: false,
    order: order++,
    createdAt: new Date().toISOString(),
    columnId: null,
    ...extra,
  })

  return {
    settings: {
      theme: 'system',
      accent: '#4772fa',
      focusMinutes: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakEvery: 4,
      weekStartsMonday: true,
      showCompleted: false,
    },
    folders: [{ id: workFolder, name: 'Work & Career', order: 0, collapsed: false }],
    tags: [
      { id: 'tag-focus', name: 'focus', color: '#4772fa' },
      { id: 'tag-errand', name: 'errand', color: '#36b37e' },
      { id: 'tag-urgent', name: 'urgent', color: '#e0392f' },
    ],
    filters: [
      {
        id: uid('flt'),
        name: 'Urgent & Important',
        emoji: '🔥',
        color: '#e0392f',
        listIds: [],
        tags: [],
        priorities: [3],
        due: 'next7',
        includeCompleted: false,
      },
    ],
    lists: [
      { id: inboxId, name: 'Inbox', color: '#4772fa', emoji: '📥', folderId: null, kanban: false, columns: [], order: 0 },
      { id: workId, name: 'Work', color: '#e0392f', emoji: '💼', folderId: workFolder, kanban: true,
        columns: [
          { id: 'col-todo', name: 'To Do' },
          { id: 'col-doing', name: 'In Progress' },
          { id: 'col-done', name: 'Done' },
        ], order: 1 },
      { id: personalId, name: 'Personal', color: '#9b51e0', emoji: '🌿', folderId: null, kanban: false, columns: [], order: 2 },
      { id: groceriesId, name: 'Groceries', color: '#36b37e', emoji: '🛒', folderId: null, kanban: false, columns: [], order: 3 },
    ],
    tasks: [
      t('Welcome to TickFlow! 👋 Click me to see details', inboxId, {
        notes:
          'This is your task detail panel. Add notes, subtasks, due dates, priorities, tags, multiple reminders and custom repeat rules here.\n\nTry the views in the top bar (List, Board, Calendar with Month/Week/Day/Agenda) and the Matrix, Habits, Focus and Stats tabs.',
        priority: 2,
      }),
      t('Plan the week', inboxId, { dueDate: today, priority: 1, countdown: true }),
      t('Finish quarterly report', workId, {
        dueDate: tomorrow, priority: 3, columnId: 'col-doing', tags: ['focus', 'urgent'],
        reminders: [`${tomorrow}T09:00:00`],
        subtasks: [
          { id: uid('s'), title: 'Gather metrics', done: true },
          { id: uid('s'), title: 'Write summary', done: false },
          { id: uid('s'), title: 'Review with team', done: false },
        ],
      }),
      t('Reply to design feedback', workId, { columnId: 'col-todo', priority: 2, dueDate: today }),
      t('Deploy v2.1', workId, { columnId: 'col-todo', dueDate: in3 }),
      t('Kickoff slides', workId, { columnId: 'col-done', completed: true, completedAt: new Date().toISOString() }),
      medsTask(personalId, order++),
      t('Trip packing ideas', personalId, {
        kind: 'note',
        notes: 'Passport & charger\nNoise-cancelling headphones\nBook for the flight\nRefill prescriptions before leaving\n\nNotes have no checkbox or due date — they just hold free-form text.',
        tags: ['ideas'],
      }),
      t('Call the dentist', personalId, { dueDate: yesterday, priority: 2, tags: ['errand'] }),
      t('Morning run', personalId, {
        dueDate: today, tags: ['focus'],
        recurrence: { ...NO_RECURRENCE, rule: 'daily' },
      }),
      t('Read 20 pages', personalId, { dueDate: today }),
      t('Milk', groceriesId, { tags: ['errand'] }),
      t('Avocados', groceriesId),
      t('Coffee beans', groceriesId, { completed: true, completedAt: new Date().toISOString() }),
    ],
    habits: [
      {
        id: uid('habit'), name: 'Drink water', emoji: '💧', color: '#00b8d9', goal: 8, unit: 'glasses',
        freq: { type: 'daily', days: [], timesPerWeek: 7 }, reminderTime: '09:00',
        archived: false, hidePrivate: false, createdAt: new Date().toISOString(), log: seedLog(7, 0.7, 8),
      },
      {
        id: uid('habit'), name: 'Meditate', emoji: '🧘', color: '#9b51e0', goal: 1, unit: 'session',
        freq: { type: 'daily', days: [], timesPerWeek: 7 }, reminderTime: null,
        archived: false, hidePrivate: false, createdAt: new Date().toISOString(), log: seedLog(10, 0.6, 1),
      },
      {
        id: uid('habit'), name: 'Workout', emoji: '💪', color: '#e0392f', goal: 1, unit: 'session',
        freq: { type: 'daily', days: [1, 2, 3, 4, 5], timesPerWeek: 5 }, reminderTime: '18:00',
        archived: false, hidePrivate: false, createdAt: new Date().toISOString(), log: seedLog(14, 0.5, 1),
      },
    ],
    pomodoros: [],
  }
}

function medsTask(listId: string, order: number): Task {
  const morning = uid('slot')
  const evening = uid('slot')
  const log: { [date: string]: string[] } = {}
  for (let i = 1; i <= 24; i++) {
    const key = format(addDays(new Date(), -i), 'yyyy-MM-dd')
    const day: string[] = []
    if (Math.random() < 0.85) day.push(morning) // morning usually taken
    if (Math.random() < 0.65) day.push(evening) // evening more often missed
    if (day.length) log[key] = day
  }
  return {
    id: uid('task'),
    title: 'Take medication',
    notes: 'Track morning and evening doses. Open this task to see the monthly calendar of which days/times you took it.',
    kind: 'task',
    listId,
    completed: false,
    completedAt: null,
    priority: 2,
    dueDate: null,
    startDate: null,
    hasTime: false,
    tags: [],
    subtasks: [],
    recurrence: { ...NO_RECURRENCE },
    recurrenceLog: [],
    hidePrivate: false,
    reminders: [],
    countdown: false,
    trackingEnabled: true,
    slots: [
      { id: morning, label: 'Morning', time: '08:00' },
      { id: evening, label: 'Evening', time: '20:00' },
    ],
    completionLog: log,
    pinned: false,
    order,
    createdAt: new Date().toISOString(),
    columnId: null,
  }
}

function seedLog(days: number, prob: number, goal: number): Record<string, number> {
  const log: Record<string, number> = {}
  for (let i = 1; i <= days; i++) {
    if (Math.random() < prob) {
      const key = format(addDays(new Date(), -i), 'yyyy-MM-dd')
      log[key] = Math.max(1, Math.round(goal * (0.6 + Math.random() * 0.4)))
    }
  }
  return log
}
