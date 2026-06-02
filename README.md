# ✅ TickFlow — Premium Task Manager

A feature-rich, **TickTick Premium-style** task & productivity app built with React, TypeScript and Vite. Plan your day, organize projects on boards, build habits, and focus with a built-in Pomodoro timer — all running entirely in your browser with offline-first local persistence.

![Premium](https://img.shields.io/badge/Tier-Premium-f5a623) ![React](https://img.shields.io/badge/React-18-4772fa) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## ✨ Features

### Tasks
- **Quick add** with natural-language parsing — `Submit report tomorrow #work !2`
  - `today` / `tomorrow` / `next week` → due date
  - `#tag` → tags
  - `!1` `!2` `!3` → Low / Medium / High priority
- Rich task detail panel: notes, due date & time, priority, tags, and **subtasks** with progress bars
- **Custom recurrence** — daily/weekly/monthly/yearly with **"every N"** intervals, weekdays, plus end conditions (never / after N occurrences / on a date)
- **Multiple reminders** per task
- **Countdown** mode showing days-remaining
- Pin/star important tasks, duplicate, move between lists, right-click context menu
- Drag-and-drop reordering

### Views
- 📋 **List view** with sorting (manual, due date, priority, title, created) and **group-by** (list / priority / due date / tag)
- 🗂️ **Kanban board** — drag cards across custom columns
- 📅 **Calendar** — **Month / Week / Day / Agenda** views
- 🎯 **Eisenhower Matrix** — auto-sorted Do / Schedule / Delegate / Eliminate quadrants

### Smart Lists
Today · Tomorrow · Next 7 Days · Inbox · High Priority · All Tasks · Completed — with live counts.
Plus **custom Smart Lists** — saved filters combining list, tag, priority, due-date and completed criteria.

### Lists, Folders & Tags
- Custom lists with emoji + color, optionally as Kanban boards
- **Folders / list groups** with collapse
- Color-coded tags with dedicated filtered views

### Premium Productivity
- 🎯 **Habit tracker** — daily goals & units, **weekday or X-times-per-week frequency**, habit reminders, streaks 🔥 and a 40-day heatmap
- ⏱️ **Focus timer** — Pomodoro cycles (focus / short / long break) **and a count-up Stopwatch**, task linking, session logging, audible chime, and **ambient white / pink / brown noise**
- 📊 **Statistics** — completion rate, overdue count, focus minutes, and a 7-day completion chart

### Polish
- 🌗 Light / Dark / System theme with customizable accent color
- 💾 Local persistence (no account needed) + JSON **export / import** backups
- 📱 Responsive layout with mobile sidebar

## 🚀 Getting Started

**Option A — Zero install:** open `TickFlow.html` directly in any modern browser
(double-click it). It's the whole app inlined into one file — no Node, no server.
Data is saved in that browser's local storage. Regenerate it with `npm run build:single`.

**Option B — Dev server (live code, hot reload):** requires Node.js 18+.

```bash
npm install
npm run dev            # start dev server (http://localhost:5173)
npm run build          # type-check + production build
npm run preview        # preview the production build
npm run build:single   # inline everything into a portable TickFlow.html
npm test               # run the unit/component test suite (Vitest)
npm run test:coverage  # run tests with a coverage report
```

## ✅ Testing

The project ships with a **Vitest + Testing Library** suite (69 tests) covering the core logic and key UI:

- `src/lib/date.test.ts` — recurrence engine (intervals & end conditions), relative-date helpers, formatting
- `src/lib/selectors.test.ts` — filter/selection matching, search, sorting, grouping, Eisenhower quadrants
- `src/store/useStore.test.ts` — task/list/folder/filter/habit reducers, recurring-task roll-forward, import/export
- `src/components/*.test.tsx` — quick-add parsing, task interactions, and an app render/navigation smoke test

## 🧱 Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| State | Zustand (with `persist` to `localStorage`) |
| Dates | date-fns |
| Icons | lucide-react |
| Styling | Hand-written CSS with CSS variables (theming) |

## 📁 Project Structure

```
src/
├── components/      # UI: Sidebar, Header, TaskListView, TaskDetail,
│                    #     KanbanView, CalendarView, HabitView,
│                    #     PomodoroView, StatsView, SettingsView, Modal
├── lib/             # date helpers, selectors, seed data, utils
├── store/           # Zustand stores (useStore = data, useUI = navigation)
├── types.ts         # shared domain types
├── App.tsx          # layout shell + theming
└── main.tsx         # entry point
```

## 💡 Notes
All data lives in your browser's `localStorage` under `tickflow-store-v1`. Use **Settings → Export backup** to save a JSON snapshot, and **Reset to demo data** to start fresh with the sample content.

---
Built as a demonstration clone — not affiliated with TickTick.
