import { MAX_SPEED } from './config'
import { clamp, rand } from './util'

// A rival rider. Tracks its own position along the track, lateral offset, speed,
// stamina (combat health) and a simple AI behaviour state.
export class Rival {
  z: number // position along track
  x: number // lateral offset in road-widths (-2..2)
  speed: number
  targetX: number
  stamina: number
  maxStamina: number
  colorIndex: number
  name: string
  lean = 0
  staggerTimer = 0
  swingTimer = 0
  swingCooldown = 0
  downTimer = 0 // knocked off the bike
  finished = false
  finishTime = 0
  aggression: number
  skill: number
  hasWeapon: boolean

  constructor(colorIndex: number, name: string, difficulty: number) {
    this.z = 0
    this.x = rand(-0.8, 0.8)
    this.targetX = this.x
    this.speed = MAX_SPEED * (0.6 + difficulty * 0.2)
    this.maxStamina = 100
    this.stamina = this.maxStamina
    this.colorIndex = colorIndex
    this.name = name
    this.aggression = clamp(0.25 + difficulty * 0.6 + rand(-0.1, 0.1), 0, 1)
    this.skill = clamp(0.55 + difficulty * 0.4 + rand(-0.08, 0.08), 0, 1.05)
    this.hasWeapon = Math.random() < 0.3 + difficulty * 0.3
  }

  get down(): boolean {
    return this.downTimer > 0
  }
}

export class Traffic {
  z: number
  x: number // lateral offset in road-widths
  spriteIndex: number
  speed: number
  constructor(z: number, x: number, spriteIndex: number, speed: number) {
    this.z = z
    this.x = x
    this.spriteIndex = spriteIndex
    this.speed = speed
  }
}

export class Weapon {
  z: number
  x: number
  taken = false
  constructor(z: number, x: number) {
    this.z = z
    this.x = x
  }
}

const FIRST = ['Razor', 'Viper', 'Tank', 'Slick', 'Diesel', 'Wolf', 'Ace', 'Nitro', 'Blaze', 'Rico']
const LAST = ['McGraw', 'Sykes', 'Cruz', 'Hall', 'Vega', 'Stone', 'Pike', 'Ortiz', 'Knox', 'Vance']
export function randomRiderName(i: number): string {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 3 + 1) % LAST.length]}`
}
