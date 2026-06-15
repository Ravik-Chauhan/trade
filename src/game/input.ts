import { clamp } from './util'

// Unified input state consumed by the game each frame. Sources: keyboard (for
// desktop testing), on-screen touch buttons, and optional device tilt.

export interface InputState {
  steer: number // -1..1
  throttle: boolean
  brake: boolean
  attackLeft: boolean
  attackRight: boolean
}

export interface TouchControl {
  id: string
  cx: number
  cy: number
  r: number
}

export class Input {
  state: InputState = { steer: 0, throttle: false, brake: false, attackLeft: false, attackRight: false }
  private keys = new Set<string>()
  private pointers = new Map<number, string>() // pointerId -> control id
  controls: TouchControl[] = []
  tiltEnabled = false
  private tilt = 0 // -1..1 from device orientation
  // edge-triggered taps (consumed once) for menu interactions
  tapPoint: { x: number; y: number } | null = null

  attach(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  setTilt(on: boolean): void {
    this.tiltEnabled = on
    if (on) {
      type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }
      const doe = window.DeviceOrientationEvent as DOE | undefined
      if (doe?.requestPermission) void doe.requestPermission().catch(() => {})
      window.addEventListener('deviceorientation', this.onOrient)
    } else {
      window.removeEventListener('deviceorientation', this.onOrient)
      this.tilt = 0
    }
  }

  private onOrient = (e: DeviceOrientationEvent): void => {
    if (e.gamma == null) return
    this.tilt = clamp(e.gamma / 35, -1, 1)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault()
    this.keys.add(e.key.toLowerCase())
  }
  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase())
  }

  /** Set on-screen controls (called when layout/orientation changes). */
  setControls(controls: TouchControl[]): void {
    this.controls = controls
  }

  private hitControl(x: number, y: number): string | null {
    for (const c of this.controls) {
      const dx = x - c.cx
      const dy = y - c.cy
      if (dx * dx + dy * dy <= c.r * c.r) return c.id
    }
    return null
  }

  private onPointerDown = (e: PointerEvent): void => {
    const x = e.clientX
    const y = e.clientY
    const hit = this.hitControl(x, y)
    if (hit) {
      this.pointers.set(e.pointerId, hit)
    } else {
      // record as a tap for menu/UI handling
      this.tapPoint = { x, y }
      this.pointers.set(e.pointerId, '')
    }
  }
  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return
    const cur = this.pointers.get(e.pointerId)
    // allow sliding off a button to release it / onto another
    const hit = this.hitControl(e.clientX, e.clientY)
    if (cur && cur !== '' && hit !== cur) {
      this.pointers.set(e.pointerId, hit ?? '')
    } else if (hit && cur === '') {
      this.pointers.set(e.pointerId, hit)
    }
  }
  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId)
  }

  private down(...keys: string[]): boolean {
    return keys.some((k) => this.keys.has(k))
  }
  private control(id: string): boolean {
    for (const v of this.pointers.values()) if (v === id) return true
    return false
  }

  /** Recompute the input state for this frame. */
  update(): void {
    let steer = 0
    if (this.down('arrowleft', 'a')) steer -= 1
    if (this.down('arrowright', 'd')) steer += 1
    if (this.control('left')) steer -= 1
    if (this.control('right')) steer += 1
    if (this.tiltEnabled && steer === 0) steer = this.tilt

    this.state.steer = clamp(steer, -1, 1)
    this.state.throttle = this.down('arrowup', 'w') || this.control('gas')
    this.state.brake = this.down('arrowdown', 's') || this.control('brake')
    this.state.attackLeft = this.down('z', 'q') || this.control('hitL')
    this.state.attackRight = this.down('x', 'e') || this.control('hitR')
  }

  /** Consume a pending tap (for menu clicks). */
  takeTap(): { x: number; y: number } | null {
    const t = this.tapPoint
    this.tapPoint = null
    return t
  }

  keyPressedOnce(key: string): boolean {
    if (this.keys.has(key)) {
      this.keys.delete(key)
      return true
    }
    return false
  }
}
