// Every sprite is drawn procedurally onto an offscreen canvas at load time.
// This keeps the game fully self-contained (no binary art assets) and original.

export interface Sprite {
  canvas: HTMLCanvasElement
  w: number
  h: number
}

function make(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  draw(ctx)
  return { canvas, w, h }
}

function shadow(c: CanvasRenderingContext2D, w: number, h: number): void {
  c.save()
  c.globalAlpha = 0.3
  c.fillStyle = '#000'
  c.beginPath()
  c.ellipse(w / 2, h - 6, w * 0.34, h * 0.05, 0, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

// A motorcycle + rider seen from behind, with a small lean offset (-2..2).
function drawBikeRear(c: CanvasRenderingContext2D, w: number, h: number, body: string, accent: string, lean: number, jacket: string): void {
  const cx = w / 2 + lean * w * 0.04
  shadow(c, w, h)
  // rear wheel
  c.fillStyle = '#111'
  c.beginPath()
  c.ellipse(cx, h - 14, w * 0.16, h * 0.12, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#333'
  c.beginPath()
  c.ellipse(cx, h - 16, w * 0.11, h * 0.085, 0, 0, Math.PI * 2)
  c.fill()
  // body / tail
  c.fillStyle = body
  c.beginPath()
  c.moveTo(cx - w * 0.16, h - 22)
  c.lineTo(cx + w * 0.16, h - 22)
  c.lineTo(cx + w * 0.1, h - 46)
  c.lineTo(cx - w * 0.1, h - 46)
  c.closePath()
  c.fill()
  // tail light
  c.fillStyle = '#ff2d2d'
  c.fillRect(cx - w * 0.05, h - 26, w * 0.1, 5)
  // rider torso (jacket)
  c.fillStyle = jacket
  c.beginPath()
  c.moveTo(cx - w * 0.13, h - 38)
  c.quadraticCurveTo(cx, h - 78, cx + w * 0.13, h - 38)
  c.lineTo(cx + w * 0.1, h - 30)
  c.lineTo(cx - w * 0.1, h - 30)
  c.closePath()
  c.fill()
  // accent stripe
  c.strokeStyle = accent
  c.lineWidth = Math.max(2, w * 0.02)
  c.beginPath()
  c.moveTo(cx - w * 0.06, h - 40)
  c.lineTo(cx - w * 0.04, h - 64)
  c.stroke()
  // arms
  c.strokeStyle = jacket
  c.lineWidth = Math.max(3, w * 0.05)
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(cx - w * 0.1, h - 50)
  c.lineTo(cx - w * 0.18 + lean * 3, h - 44)
  c.moveTo(cx + w * 0.1, h - 50)
  c.lineTo(cx + w * 0.18 + lean * 3, h - 44)
  c.stroke()
  // helmet
  c.fillStyle = accent
  c.beginPath()
  c.arc(cx, h - 74, w * 0.11, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = 'rgba(0,0,0,0.55)'
  c.beginPath()
  c.arc(cx, h - 72, w * 0.07, Math.PI * 0.15, Math.PI * 0.85)
  c.fill()
}

function drawCarRear(c: CanvasRenderingContext2D, w: number, h: number, body: string): void {
  shadow(c, w, h)
  c.fillStyle = '#111'
  c.fillRect(w * 0.1, h - 18, w * 0.18, 12)
  c.fillRect(w * 0.72, h - 18, w * 0.18, 12)
  c.fillStyle = body
  roundRect(c, w * 0.08, h - 40, w * 0.84, 30, 6)
  c.fill()
  roundRect(c, w * 0.2, h - 62, w * 0.6, 26, 8)
  c.fill()
  // rear window
  c.fillStyle = 'rgba(120,160,200,0.5)'
  roundRect(c, w * 0.26, h - 58, w * 0.48, 18, 5)
  c.fill()
  // tail lights
  c.fillStyle = '#ff3b3b'
  roundRect(c, w * 0.1, h - 34, w * 0.14, 9, 3)
  c.fill()
  roundRect(c, w * 0.76, h - 34, w * 0.14, 9, 3)
  c.fill()
  c.fillStyle = '#ffd23b'
  c.fillRect(w * 0.46, h - 30, w * 0.08, 4)
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

function drawTree(c: CanvasRenderingContext2D, w: number, h: number, dark: string, light: string): void {
  shadow(c, w, h)
  c.fillStyle = '#4a2f1d'
  c.fillRect(w / 2 - w * 0.04, h * 0.55, w * 0.08, h * 0.45)
  for (let i = 0; i < 3; i++) {
    const ty = h * 0.55 - i * h * 0.16
    const tw = w * (0.5 - i * 0.12)
    c.fillStyle = i % 2 ? light : dark
    c.beginPath()
    c.moveTo(w / 2, ty - h * 0.25)
    c.lineTo(w / 2 - tw, ty)
    c.lineTo(w / 2 + tw, ty)
    c.closePath()
    c.fill()
  }
}

function drawSign(c: CanvasRenderingContext2D, w: number, h: number, text: string, bg: string): void {
  shadow(c, w, h)
  c.fillStyle = '#555'
  c.fillRect(w / 2 - 3, h * 0.4, 6, h * 0.6)
  c.fillStyle = bg
  roundRect(c, w * 0.08, h * 0.06, w * 0.84, h * 0.4, 6)
  c.fill()
  c.fillStyle = '#fff'
  c.font = `800 ${Math.floor(h * 0.16)}px 'Trebuchet MS', sans-serif`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(text, w / 2, h * 0.26)
}

function drawRock(c: CanvasRenderingContext2D, w: number, h: number): void {
  shadow(c, w, h)
  c.fillStyle = '#7c736b'
  c.beginPath()
  c.moveTo(w * 0.1, h)
  c.lineTo(w * 0.25, h * 0.4)
  c.lineTo(w * 0.55, h * 0.2)
  c.lineTo(w * 0.85, h * 0.5)
  c.lineTo(w * 0.92, h)
  c.closePath()
  c.fill()
  c.fillStyle = '#5e574f'
  c.beginPath()
  c.moveTo(w * 0.55, h * 0.2)
  c.lineTo(w * 0.85, h * 0.5)
  c.lineTo(w * 0.92, h)
  c.lineTo(w * 0.55, h)
  c.closePath()
  c.fill()
}

function drawWeapon(c: CanvasRenderingContext2D, w: number, h: number): void {
  // a club / pipe pickup glinting on the road
  c.save()
  c.translate(w / 2, h / 2)
  c.rotate(-0.5)
  c.fillStyle = '#9aa0a6'
  roundRect(c, -w * 0.05, -h * 0.34, w * 0.1, h * 0.68, 4)
  c.fill()
  c.fillStyle = '#c9ced4'
  roundRect(c, -w * 0.05, -h * 0.34, w * 0.04, h * 0.68, 4)
  c.fill()
  c.restore()
  c.fillStyle = 'rgba(255,255,255,0.85)'
  c.beginPath()
  c.arc(w * 0.62, h * 0.32, 3, 0, Math.PI * 2)
  c.fill()
}

export interface SpriteSet {
  playerBike: Sprite[] // by lean index 0..4
  rivalBikes: Sprite[][] // [colorIndex][lean]
  cars: Sprite[]
  trees: Sprite[]
  signs: Sprite[]
  rocks: Sprite[]
  weapon: Sprite
  crashed: Sprite
}

const RIVAL_COLORS: Array<[string, string, string]> = [
  ['#e84118', '#fbc531', '#2f3640'],
  ['#0097e6', '#dff9fb', '#192a56'],
  ['#44bd32', '#c8f7c5', '#1b4332'],
  ['#8c7ae6', '#f5f6fa', '#2c2c54'],
  ['#e1b12c', '#2f3640', '#2f3640'],
]

export function buildSprites(playerBody: string, playerAccent: string): SpriteSet {
  const leans = [-2, -1, 0, 1, 2]
  const playerBike = leans.map((l) => make(120, 110, (c) => drawBikeRear(c, 120, 110, playerBody, playerAccent, l, '#222a3a')))
  const rivalBikes = RIVAL_COLORS.map(([body, accent, jacket]) =>
    leans.map((l) => make(110, 104, (c) => drawBikeRear(c, 110, 104, body, accent, l, jacket)))
  )
  const carColors = ['#c23616', '#0097e6', '#353b48', '#fbc531', '#487eb0', '#e1b12c']
  const cars = carColors.map((col) => make(130, 80, (c) => drawCarRear(c, 130, 80, col)))
  const trees = [
    make(120, 160, (c) => drawTree(c, 120, 160, '#0e3b2e', '#155e43')),
    make(140, 200, (c) => drawTree(c, 140, 200, '#13402f', '#1c7a52')),
  ]
  const signs = [
    make(120, 130, (c) => drawSign(c, 120, 130, 'SLOW', '#d35400')),
    make(120, 130, (c) => drawSign(c, 120, 130, 'CURVE', '#2980b9')),
    make(120, 130, (c) => drawSign(c, 120, 130, 'MILE', '#27ae60')),
  ]
  const rocks = [make(120, 90, (c) => drawRock(c, 120, 90)), make(150, 110, (c) => drawRock(c, 150, 110))]
  const weapon = make(60, 60, (c) => drawWeapon(c, 60, 60))
  const crashed = make(120, 90, (c) => {
    shadow(c, 120, 90)
    c.fillStyle = '#444'
    c.beginPath()
    c.ellipse(60, 60, 34, 18, 0.3, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#222a3a'
    c.beginPath()
    c.ellipse(44, 52, 16, 12, -0.4, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#ffd23b'
    c.beginPath()
    c.arc(34, 46, 9, 0, Math.PI * 2)
    c.fill()
  })
  return { playerBike, rivalBikes, cars, trees, signs, rocks, weapon, crashed }
}
