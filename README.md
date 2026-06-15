# 🏍️ Road Rebels — Moto Combat Racing

A fast, **original pseudo-3D motorcycle combat racer** in the spirit of the
classic moto-brawler arcade games of the 90s — race a pack of rivals down
curving highways, **punch and kick them off their bikes**, dodge traffic, and
win cash to buy faster machines and climb a career ladder.

Built with **TypeScript + HTML5 Canvas** (no game engine, no framework) and
shipped to **Android** via Capacitor as an installable APK.

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26) ![Android](https://img.shields.io/badge/Android-Capacitor-3ddc84)

> **About the inspiration:** Road Rebels is an *original* game in the same genre
> as the classic motorcycle-combat racers. All code, artwork and sound are
> generated procedurally in this repo — it contains **no assets, names or audio
> from any commercial game**, and is not affiliated with or endorsed by any
> rights holder.

## 🎮 Gameplay

- **Pseudo-3D road engine** — segment-projected curves, hills, rumble strips,
  lane lines, fog and a dusk skyline, rendered entirely on a 2D canvas.
- **On-bike combat** — pull alongside a rival and hit the punch button on their
  side to drain their health; knock them down for a **$250 bounty**. Grab a
  **pipe** off the road for harder hits.
- **Rival AI** — opponents pace you, swerve around traffic, close in to attack,
  stagger when hit, and wipe out when their health is gone.
- **Hazards** — passing traffic to weave through, grass that slows you, and a
  wreck system: crash too many times and you get **BUSTED**.
- **Career mode** — six escalating tracks from *Coast Run* to the *Grand Final*,
  prize money, a **garage** with five buyable bikes (speed / accel / grip /
  toughness trade-offs), and saved best times.
- **Controls** — touch (steer ◀▶, gas ▲, brake ▼, punch ✊×2) or keyboard
  (arrows/WASD, Z/X to hit, P to pause). Optional **tilt steering**.
- **Fully offline**, no accounts, no ads. Progress saved in local storage.

## 🚀 Run it

Requires Node.js 18+.

```bash
npm install
npm run dev       # play in the browser at http://localhost:5173
npm run build     # type-check + production build (outputs to dist/)
npm run preview   # preview the production build
npm test          # headless game-loop smoke test + unit tests (Vitest)
```

Open in a desktop browser and use the arrow keys, or open on a phone for touch
controls. Landscape is recommended.

## 📱 Android APK

The game builds into a real, installable Android APK via Capacitor. The easiest
route needs **no local Android tooling** — push to the game branch (or trigger
the workflow) and download the artifact from GitHub Actions. Full instructions
are in **[ANDROID.md](./ANDROID.md)**.

```bash
npm run android:apk   # local build → android/app/build/outputs/apk/debug/app-debug.apk
```

## 🧱 How it works

| Concern | Approach |
| --- | --- |
| Rendering | HTML5 Canvas 2D, classic segment-projection pseudo-3D road |
| Art | Procedurally drawn to offscreen canvases at load (bikes, riders, cars, scenery) |
| Audio | Web Audio API — RPM-tracking engine drone + synthesised SFX |
| Game loop | `requestAnimationFrame` with a fixed-clamped delta |
| Persistence | `localStorage` (cash, owned bikes, career progress, best times) |
| Android shell | Capacitor (status bar, splash, hardware back button, landscape lock) |
| Build | Vite 5 + TypeScript (strict) |

## 📁 Project structure

```
src/
├── game/
│   ├── game.ts       # state machine: menus, garage, race sim, combat, HUD
│   ├── road.ts       # pseudo-3D track building + projection + rendering
│   ├── entities.ts   # rival AI, traffic, weapon pickups
│   ├── sprites.ts    # procedural sprite generation (no image files)
│   ├── audio.ts      # Web Audio engine + SFX synthesis
│   ├── input.ts      # keyboard + touch + tilt input
│   ├── ui.ts         # canvas button / panel helpers
│   ├── tracks.ts     # bike + track catalogue
│   ├── save.ts       # localStorage persistence
│   ├── config.ts     # engine tunables + palette
│   ├── util.ts       # math + RNG helpers
│   ├── types.ts      # shared types
│   └── game.test.ts  # headless smoke + unit tests
├── main.ts           # bootstrap: canvas, loop, Capacitor integration
└── style.css         # fullscreen canvas styling
```

## 🎯 How to play

1. **RACE** → pick a track → **RACE!**
2. Hold **gas** (▲ / Up). Steer with ◀ ▶ (or arrows). Stay on the asphalt.
3. When a rival is beside you, hit the **punch** button on their side (✊, or
   Z/X). Knock them down for cash.
4. Grab a **pipe** on the road for stronger hits.
5. Finish **1st** to win the prize and unlock the next race. Spend your winnings
   in the **GARAGE** on a faster bike.

---
An original game — not affiliated with, or derived from, any commercial title.
