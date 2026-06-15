import { Game } from './game/game'
import { Input } from './game/input'
import './style.css'

const canvas = document.getElementById('game') as HTMLCanvasElement
const input = new Input()
input.attach(canvas)
const game = new Game(canvas, input)

let dpr = Math.min(window.devicePixelRatio || 1, 2)

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  game.resize(w, h)
}

window.addEventListener('resize', resize)
window.addEventListener('orientationchange', () => setTimeout(resize, 200))

let last = performance.now()
function loop(now: number): void {
  let dt = (now - last) / 1000
  last = now
  if (dt > 0.05) dt = 0.05 // clamp to avoid physics jumps after a stall
  game.update(dt)
  game.render()
  requestAnimationFrame(loop)
}

async function boot(): Promise<void> {
  resize()
  await game.init()

  // Native integration (no-ops on web).
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { SplashScreen } = await import('@capacitor/splash-screen')
      void SplashScreen.hide()
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      void StatusBar.hide().catch(() => {})
      const { App } = await import('@capacitor/app')
      void App.addListener('backButton', () => {
        if (game.handleBack()) void App.exitApp()
      })
    } else if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
    }
  } catch {
    /* capacitor not present on the web build — fine */
  }

  requestAnimationFrame(loop)
}

void boot()
