# ✅ TickFlow — Premium Task Manager

A feature-rich, **TickTick Premium-style** task & productivity app built with React, TypeScript and Vite. Plan your day, organize projects on boards, build habits, and focus with a built-in Pomodoro timer — all running entirely in your browser with offline-first local persistence.

![Premium](https://img.shields.io/badge/Tier-Premium-f5a623) ![React](https://img.shields.io/badge/React-18-4772fa) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## ✨ Features

### Tasks
- **Quick add** with natural-language parsing — `Submit report tomorrow #work !2`
  - `today` / `tomorrow` / `next week` → due date
  - `#tag` → tags
  - `!1` `!2` `!3` → Low / Medium / High priority
- Rich task detail panel: notes, due date & time, **recurring rules** (daily, weekdays, weekly, monthly, yearly), reminders, priority, tags, and **subtasks** with progress bars
- Pin/star important tasks, duplicate, move between lists, right-click context menu
- Drag-and-drop reordering

### Views
- 📋 **List view** with sorting (manual, due date, priority, title, created)
- 🗂️ **Kanban board** — drag cards across custom columns
- 📅 **Calendar** — month grid showing every scheduled task

### Smart Lists
Today · Tomorrow · Next 7 Days · Inbox · High Priority · All Tasks · Completed — with live counts.

### Lists, Folders & Tags
- Custom lists with emoji + color, optionally as Kanban boards
- Color-coded tags with dedicated filtered views

### Premium Productivity
- 🎯 **Habit tracker** — daily goals, units, streaks 🔥 and a 40-day heatmap
- ⏱️ **Pomodoro focus timer** — focus / short break / long break cycles, task linking, session logging, and an audible chime
- 📊 **Statistics** — completion rate, overdue count, focus minutes, and a 7-day completion chart

### Polish
- 🌗 Light / Dark / System theme with customizable accent color
- 💾 Local persistence (no account needed) + JSON **export / import** backups
- 📱 Responsive layout with mobile sidebar

## 🚀 Getting Started

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

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
