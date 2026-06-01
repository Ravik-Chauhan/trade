export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36).slice(-4) +
    Math.random().toString(36).slice(2, 8)
  )
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export const PRIORITY_META = [
  { value: 0, label: 'None', color: 'var(--text-muted)' },
  { value: 1, label: 'Low', color: '#4772fa' },
  { value: 2, label: 'Medium', color: '#f5a623' },
  { value: 3, label: 'High', color: '#e0392f' },
] as const

export const LIST_COLORS = [
  '#4772fa',
  '#e0392f',
  '#f5a623',
  '#36b37e',
  '#9b51e0',
  '#00b8d9',
  '#ff5f7e',
  '#7a869a',
]

export const HABIT_EMOJIS = ['🏃', '📚', '💧', '🧘', '💪', '🥗', '😴', '✍️', '🎯', '🎸', '🧹', '☀️']
