import type { Button } from './types'

export function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

export function drawButton(c: CanvasRenderingContext2D, b: Button, scale: number): void {
  c.save()
  const grad = c.createLinearGradient(0, b.y, 0, b.y + b.h)
  if (b.disabled) {
    grad.addColorStop(0, '#3a3f4c')
    grad.addColorStop(1, '#2a2e38')
  } else if (b.danger) {
    grad.addColorStop(0, '#e84a4a')
    grad.addColorStop(1, '#b02525')
  } else {
    grad.addColorStop(0, '#ff8a3d')
    grad.addColorStop(1, '#e0541a')
  }
  roundRectPath(c, b.x, b.y, b.w, b.h, 12 * scale)
  c.fillStyle = grad
  c.fill()
  c.lineWidth = 2 * scale
  c.strokeStyle = b.disabled ? '#555' : 'rgba(255,255,255,0.35)'
  c.stroke()

  c.fillStyle = b.disabled ? '#8a8f99' : '#fff'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  if (b.sub) {
    c.font = `800 ${Math.round(20 * scale)}px 'Trebuchet MS', sans-serif`
    c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 - 11 * scale)
    c.font = `600 ${Math.round(12 * scale)}px 'Trebuchet MS', sans-serif`
    c.globalAlpha = 0.9
    c.fillText(b.sub, b.x + b.w / 2, b.y + b.h / 2 + 12 * scale)
  } else {
    c.font = `800 ${Math.round(22 * scale)}px 'Trebuchet MS', sans-serif`
    c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2)
  }
  c.restore()
}

export function hitButton(buttons: Button[], x: number, y: number): Button | null {
  for (const b of buttons) {
    if (b.disabled) continue
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b
  }
  return null
}

export function panel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 16): void {
  roundRectPath(c, x, y, w, h, r)
  c.fillStyle = 'rgba(12,16,28,0.82)'
  c.fill()
  c.lineWidth = 2
  c.strokeStyle = 'rgba(255,138,61,0.4)'
  c.stroke()
}
