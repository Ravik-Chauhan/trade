import { audio } from './audio'
import {
  ACCEL,
  BRAKING,
  CENTRIFUGAL,
  COLORS,
  DECEL,
  DRAW_DISTANCE,
  FIELD_OF_VIEW,
  MAX_SPEED,
  MPH_PER_UNIT,
  OFF_ROAD_DECEL,
  OFF_ROAD_LIMIT,
  SEG_LENGTH,
} from './config'
import { Rival, Traffic, Weapon, randomRiderName } from './entities'
import { Input } from './input'
import { Road } from './road'
import { loadSave, resetSave, writeSave } from './save'
import { buildSprites, type Sprite, type SpriteSet } from './sprites'
import { BIKES, TRACKS, getBike, getTrack } from './tracks'
import type { BikeSpec, Button, SaveData, Screen, TrackSpec } from './types'
import { clamp, fmtTime, lerp, ordinal } from './util'
import { drawButton, hitButton, panel } from './ui'

const SPRITES_SCALE = 0.3 / 120

interface Player {
  z: number
  x: number // lateral offset in road-widths
  speed: number
  stamina: number
  lean: number
  crashTimer: number
  attackL: number
  attackR: number
  attackCool: number
  weapon: number // remaining hits, 0 = fists
  finished: boolean
  finishTime: number
  place: number
}

export class Game {
  private ctx: CanvasRenderingContext2D
  private input: Input
  W = 800
  H = 450
  scale = 1 // UI scale relative to a 800px baseline
  screen: Screen = 'loading'
  private cameraDepth = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180)

  private save: SaveData
  private sprites!: SpriteSet
  private road = new Road()
  private track!: TrackSpec
  private bike!: BikeSpec

  private player!: Player
  private rivals: Rival[] = []
  private traffic: Traffic[] = []
  private weapons: Weapon[] = []
  private raceTime = 0
  private countdown = 0
  private wrecks = 0
  private bounty = 0
  private baseIndex = 0
  private message = ''
  private messageTimer = 0
  private resultWin = false
  private resultPrize = 0
  private buttons: Button[] = []
  private garageBikeIndex = 0
  private flashTimer = 0
  private hitFlash = 0

  // pre-race selection
  private selectedTrack = 0

  constructor(canvas: HTMLCanvasElement, input: Input) {
    this.ctx = canvas.getContext('2d')!
    this.input = input
    this.save = loadSave()
    audio.setEnabled(this.save.settings.sound)
    input.setTilt(this.save.settings.tilt)
  }

  async init(): Promise<void> {
    this.bike = getBike(this.save.currentBike)
    this.sprites = buildSprites(this.bike.color, this.bike.accent)
    this.screen = 'title'
  }

  resize(w: number, h: number): void {
    this.W = w
    this.H = h
    this.scale = clamp(Math.min(w, h * 1.6) / 800, 0.7, 2.2)
    this.layoutRaceControls()
  }

  private layoutRaceControls(): void {
    const s = this.scale
    const r = 46 * s
    const pad = 26 * s
    const bottom = this.H - pad - r
    // left cluster: steer left/right
    const left = { id: 'left', cx: pad + r, cy: bottom, r }
    const right = { id: 'right', cx: pad + r * 3 + 14 * s, cy: bottom, r }
    // right cluster: brake + gas
    const gas = { id: 'gas', cx: this.W - pad - r, cy: bottom, r: r * 1.15 }
    const brake = { id: 'brake', cx: this.W - pad - r * 3 - 14 * s, cy: bottom, r }
    // attack buttons: above clusters
    const hitL = { id: 'hitL', cx: pad + r + 6 * s, cy: bottom - r * 2 - 16 * s, r: r * 0.9 }
    const hitR = { id: 'hitR', cx: this.W - pad - r - 6 * s, cy: bottom - r * 2 - 16 * s, r: r * 0.9 }
    this.input.setControls([left, right, gas, brake, hitL, hitR])
  }

  // ───────────────────────── Race setup ─────────────────────────
  private startRace(trackId: string): void {
    this.track = getTrack(trackId)
    this.bike = getBike(this.save.currentBike)
    this.sprites = buildSprites(this.bike.color, this.bike.accent)
    this.road.build(this.track)
    this.player = {
      z: 0,
      x: 0,
      speed: 0,
      stamina: 100,
      lean: 0,
      crashTimer: 0,
      attackL: 0,
      attackR: 0,
      attackCool: 0,
      weapon: 0,
      finished: false,
      finishTime: 0,
      place: 1,
    }
    this.rivals = []
    const n = this.track.rivals
    for (let i = 0; i < n; i++) {
      const rv = new Rival(i % 5, randomRiderName(i + this.track.seed), this.track.difficulty)
      rv.z = SEG_LENGTH * (2 + i * 1.5)
      rv.x = lerp(-1, 1, (i + 1) / (n + 1))
      this.rivals.push(rv)
    }
    // traffic spread along the track moving slowly forward
    this.traffic = []
    const tcount = Math.floor(this.track.length * 0.12 * this.track.traffic)
    for (let i = 0; i < tcount; i++) {
      const z = SEG_LENGTH * (40 + Math.random() * (this.track.length - 60))
      const x = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.7)
      this.traffic.push(new Traffic(z, x, Math.floor(Math.random() * this.sprites.cars.length), MAX_SPEED * (0.16 + Math.random() * 0.12)))
    }
    // weapon pickups
    this.weapons = []
    const wcount = Math.max(2, Math.floor(this.track.length / 280))
    for (let i = 0; i < wcount; i++) {
      const z = SEG_LENGTH * (50 + Math.random() * (this.track.length - 70))
      this.weapons.push(new Weapon(z, (Math.random() * 2 - 1) * 0.8))
    }
    this.raceTime = 0
    this.countdown = 3.2
    this.wrecks = 0
    this.bounty = 0
    this.message = ''
    this.messageTimer = 0
    audio.resume()
    audio.startEngine()
    this.screen = 'race'
  }

  private setMessage(text: string, time = 2): void {
    this.message = text
    this.messageTimer = time
  }

  // ───────────────────────── Update ─────────────────────────
  update(dt: number): void {
    this.input.update()
    this.flashTimer += dt
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt)
    if (this.screen === 'race') this.updateRace(dt)
    else this.handleMenuInput()
  }

  private updateRace(dt: number): void {
    const p = this.player
    const inp = this.input.state

    // pause via keyboard
    if (this.input.keyPressedOnce('escape') || this.input.keyPressedOnce('p')) {
      this.screen = 'paused'
      audio.stopEngine()
      return
    }
    // pause button tap (top-right)
    const tap = this.input.takeTap()
    if (tap && tap.x > this.W - 64 * this.scale && tap.y < 64 * this.scale) {
      this.screen = 'paused'
      audio.stopEngine()
      return
    }

    if (this.countdown > 0) {
      const before = Math.ceil(this.countdown)
      this.countdown -= dt
      const after = Math.ceil(this.countdown)
      if (after !== before && after >= 0) audio.beep(after === 0)
      audio.updateEngine(0.35 + Math.sin(this.flashTimer * 20) * 0.1, 0.3)
    }
    const racing = this.countdown <= 0 && !p.finished

    // ── Player physics ──
    const seg = this.road.segmentAt(p.z)
    const speedPercent = p.speed / MAX_SPEED
    const onRoad = Math.abs(p.x) < 1.9

    if (p.crashTimer > 0) {
      p.crashTimer -= dt
      p.speed = Math.max(0, p.speed + DECEL * 2 * dt)
      if (p.crashTimer <= 0) {
        p.stamina = Math.min(100, p.stamina + 30)
        p.x = clamp(p.x, -0.6, 0.6)
      }
    } else if (racing) {
      // steering
      const steerSpeed = 1.5 * speedPercent * dt
      p.x += inp.steer * steerSpeed * (0.9 + this.bike.grip * 0.3)
      p.lean = lerp(p.lean, inp.steer * 2 + clamp(-seg.curve, -2, 2) * 0.4, dt * 8)
      // curve centrifugal push
      p.x -= seg.curve * speedPercent * CENTRIFUGAL * dt * (2 - this.bike.grip)

      // throttle / brake
      if (inp.throttle) p.speed += ACCEL * this.bike.accel * dt
      else if (inp.brake) p.speed += BRAKING * dt
      else p.speed += DECEL * dt
      if (!onRoad) {
        // Grass slows you to the off-road limit but never to a dead stop while
        // on the throttle — only decelerate when above the cap.
        if (p.speed > OFF_ROAD_LIMIT) {
          p.speed += OFF_ROAD_DECEL * dt
          if (p.speed < OFF_ROAD_LIMIT) p.speed = OFF_ROAD_LIMIT
        }
        p.lean += Math.sin(this.flashTimer * 40) * 0.3 // rumble
      }
      p.speed = clamp(p.speed, 0, MAX_SPEED * this.bike.topSpeed)
      p.x = clamp(p.x, -2.1, 2.1)

      // attacks
      p.attackCool = Math.max(0, p.attackCool - dt)
      if (p.attackL > 0) p.attackL -= dt
      if (p.attackR > 0) p.attackR -= dt
      if (inp.attackLeft && p.attackCool <= 0) this.playerAttack(-1)
      if (inp.attackRight && p.attackCool <= 0) this.playerAttack(1)
    }

    // advance
    p.z += p.speed * dt
    if (p.z >= this.road.trackLength && !p.finished) {
      p.finished = true
      p.finishTime = this.raceTime
      p.place = 1 + this.rivals.filter((r) => r.finished).length
      this.finishRace()
      return
    }

    if (racing) this.raceTime += dt

    // ── Rivals ──
    for (const rv of this.rivals) this.updateRival(rv, dt, racing)

    // ── Traffic (moves slowly forward) ──
    for (const t of this.traffic) {
      t.z += t.speed * dt
      if (t.z > this.road.trackLength) t.z -= this.road.trackLength
    }
    // collision with traffic
    if (p.crashTimer <= 0 && racing) {
      for (const t of this.traffic) {
        if (Math.abs(t.z - p.z) < SEG_LENGTH * 0.7 && Math.abs(t.x - p.x) < 0.42 && p.speed > t.speed + MAX_SPEED * 0.1) {
          this.crashPlayer('Traffic!')
          break
        }
      }
    }

    // ── Weapon pickups ──
    if (racing && p.crashTimer <= 0) {
      for (const w of this.weapons) {
        if (!w.taken && Math.abs(w.z - p.z) < SEG_LENGTH * 0.8 && Math.abs(w.x - p.x) < 0.4) {
          w.taken = true
          p.weapon = 8
          audio.pickup()
          this.setMessage('WEAPON: PIPE', 1.6)
        }
      }
    }

    // stamina recovers slowly
    if (p.stamina < 100) p.stamina = Math.min(100, p.stamina + dt * 4)

    if (this.messageTimer > 0) this.messageTimer -= dt

    // place calc
    p.place = this.computePlace()

    // engine audio
    const rpm = clamp(p.speed / (MAX_SPEED * this.bike.topSpeed), 0, 1)
    audio.updateEngine(rpm, inp.throttle ? 1 : 0.2)

    this.renderRace()
  }

  private updateRival(rv: Rival, dt: number, racing: boolean): void {
    const p = this.player
    if (rv.finished) return
    if (rv.downTimer > 0) {
      rv.downTimer -= dt
      rv.speed = Math.max(MAX_SPEED * 0.15, rv.speed + DECEL * dt)
      rv.z += rv.speed * dt
      if (rv.downTimer <= 0) {
        rv.stamina = rv.maxStamina * 0.7
        rv.speed = MAX_SPEED * 0.4
      }
      return
    }
    if (!racing) return
    rv.staggerTimer = Math.max(0, rv.staggerTimer - dt)
    rv.swingCooldown = Math.max(0, rv.swingCooldown - dt)
    if (rv.swingTimer > 0) rv.swingTimer -= dt

    // target speed near player ability, modulated by skill
    const targetSpeed = MAX_SPEED * (0.62 + this.track.difficulty * 0.34 + rv.skill * 0.06)
    if (rv.staggerTimer > 0) rv.speed = Math.max(MAX_SPEED * 0.2, rv.speed + DECEL * dt)
    else rv.speed += (targetSpeed - rv.speed) * dt * 0.8

    // steer toward target lane; sometimes toward player to attack
    const dz = p.z - rv.z
    const near = Math.abs(dz) < SEG_LENGTH * 1.2 && !p.finished && p.crashTimer <= 0
    if (near && Math.random() < rv.aggression * dt * 1.5) {
      rv.targetX = clamp(p.x, -1.4, 1.4) // close in
    } else if (Math.random() < dt * 0.4) {
      rv.targetX = clamp(rv.targetX + (Math.random() * 2 - 1) * 0.5, -1.3, 1.3)
    }
    // avoid traffic ahead
    for (const t of this.traffic) {
      if (t.z > rv.z && t.z - rv.z < SEG_LENGTH * 3 && Math.abs(t.x - rv.x) < 0.4) {
        rv.targetX = clamp(rv.x + (rv.x < t.x ? -0.8 : 0.8), -1.6, 1.6)
      }
    }
    rv.x += clamp(rv.targetX - rv.x, -1, 1) * dt * 1.6 * rv.skill
    const seg = this.road.segmentAt(rv.z)
    rv.x -= seg.curve * (rv.speed / MAX_SPEED) * CENTRIFUGAL * dt
    rv.lean = lerp(rv.lean, clamp((rv.targetX - rv.x) * 4 - seg.curve, -2, 2), dt * 6)
    rv.z += rv.speed * dt

    // rival attacks the player when alongside
    if (near && Math.abs(rv.x - p.x) < 0.5 && rv.swingCooldown <= 0 && Math.random() < rv.aggression * dt * 2.2) {
      rv.swingTimer = 0.35
      rv.swingCooldown = 0.9 + Math.random() * 0.8
      const dmg = (rv.hasWeapon ? 16 : 9) * (0.7 + this.track.difficulty * 0.6)
      this.damagePlayer(dmg, rv.x < p.x ? -1 : 1)
    }

    if (rv.z >= this.road.trackLength && !rv.finished) {
      rv.finished = true
      rv.finishTime = this.raceTime
    }
  }

  private playerAttack(side: number): void {
    const p = this.player
    p.attackCool = 0.45
    if (side < 0) p.attackL = 0.3
    else p.attackR = 0.3
    audio.punch()
    let landed = false
    for (const rv of this.rivals) {
      if (rv.finished || rv.down) continue
      const dz = rv.z - p.z
      const sameSide = Math.sign(rv.x - p.x) === Math.sign(side) || Math.abs(rv.x - p.x) < 0.25
      if (Math.abs(dz) < SEG_LENGTH * 1.1 && Math.abs(rv.x - p.x) < 0.65 && sameSide) {
        const dmg = (p.weapon > 0 ? 24 : 13) * (0.8 + this.bike.toughness * 0.3)
        rv.stamina -= dmg
        rv.staggerTimer = 0.5
        rv.speed = Math.max(MAX_SPEED * 0.2, rv.speed * 0.7)
        rv.x += side * 0.12
        landed = true
        if (p.weapon > 0) p.weapon--
        if (rv.stamina <= 0) this.knockDownRival(rv)
        break
      }
    }
    if (landed) {
      audio.hit()
      if (p.weapon === 0) this.setMessageBrief()
    }
  }

  private setMessageBrief(): void {
    /* weapon just broke */
    this.setMessage('PIPE BROKE', 1.2)
  }

  private knockDownRival(rv: Rival): void {
    rv.downTimer = 3.2
    rv.stamina = 0
    rv.speed = MAX_SPEED * 0.1
    this.bounty += 250
    this.setMessage(`${rv.name} DOWN! +$250`, 2)
    audio.crash()
  }

  private damagePlayer(amount: number, side: number): void {
    const p = this.player
    if (p.crashTimer > 0) return
    p.stamina -= amount / this.bike.toughness
    p.x += side * 0.06
    this.hitFlash = 0.25
    audio.hit()
    if (p.stamina <= 0) this.crashPlayer('Knocked Down!')
  }

  private crashPlayer(reason: string): void {
    const p = this.player
    if (p.crashTimer > 0) return
    p.crashTimer = 2.6
    p.stamina = 1
    p.weapon = 0
    this.wrecks++
    audio.crash()
    this.setMessage(reason, 2)
    if (this.wrecks >= 6) {
      this.screen = 'gameover'
      audio.stopEngine()
    }
  }

  private computePlace(): number {
    const me = this.player.finished ? this.road.trackLength + 1e7 - this.player.finishTime : this.player.z
    let ahead = 0
    for (const rv of this.rivals) {
      const prog = rv.finished ? this.road.trackLength + 1e7 - rv.finishTime : rv.z
      if (prog > me) ahead++
    }
    return ahead + 1
  }

  private finishRace(): void {
    audio.stopEngine()
    const p = this.player
    this.resultWin = p.place === 1
    let prize = this.bounty
    if (p.place === 1) prize += this.track.prize
    else if (p.place === 2) prize += Math.floor(this.track.prize * 0.4)
    else if (p.place === 3) prize += Math.floor(this.track.prize * 0.2)
    this.resultPrize = prize
    this.save.money += prize
    this.save.races++
    if (p.place === 1) {
      this.save.wins++
      audio.fanfare()
      // advance career if this was the next career race
      const idx = TRACKS.findIndex((t) => t.id === this.track.id)
      if (idx === this.save.careerProgress) this.save.careerProgress = Math.min(TRACKS.length, idx + 1)
    }
    const best = this.save.bestTimes[this.track.id]
    if (p.finished && (best == null || p.finishTime < best)) this.save.bestTimes[this.track.id] = p.finishTime
    writeSave(this.save)
    this.screen = 'results'
  }

  // ───────────────────────── Menu input ─────────────────────────
  private handleMenuInput(): void {
    if (this.screen === 'paused') {
      if (this.input.keyPressedOnce('escape') || this.input.keyPressedOnce('p')) {
        this.resumeRace()
        return
      }
    }
    if (this.input.keyPressedOnce('enter')) {
      if (this.screen === 'title') this.screen = 'menu'
    }
    const tap = this.input.takeTap()
    if (!tap) return
    const b = hitButton(this.buttons, tap.x, tap.y)
    if (this.screen === 'title') {
      this.screen = 'menu'
      audio.resume()
      return
    }
    if (!b) return
    audio.beep()
    this.onButton(b.id)
  }

  private resumeRace(): void {
    this.screen = 'race'
    audio.resume()
    audio.startEngine()
  }

  private onButton(id: string): void {
    switch (id) {
      case 'career': {
        this.selectedTrack = Math.min(this.save.careerProgress, TRACKS.length - 1)
        this.screen = 'levelSelect'
        break
      }
      case 'garage':
        this.garageBikeIndex = BIKES.findIndex((b) => b.id === this.save.currentBike)
        if (this.garageBikeIndex < 0) this.garageBikeIndex = 0
        this.screen = 'garage'
        break
      case 'help':
        this.screen = 'help'
        break
      case 'back':
        this.screen = 'menu'
        break
      case 'resetSave':
        this.save = resetSave()
        this.bike = getBike(this.save.currentBike)
        this.sprites = buildSprites(this.bike.color, this.bike.accent)
        this.screen = 'menu'
        break
      case 'soundToggle':
        this.save.settings.sound = !this.save.settings.sound
        audio.setEnabled(this.save.settings.sound)
        writeSave(this.save)
        break
      case 'tiltToggle':
        this.save.settings.tilt = !this.save.settings.tilt
        this.input.setTilt(this.save.settings.tilt)
        writeSave(this.save)
        break
      case 'garagePrev':
        this.garageBikeIndex = (this.garageBikeIndex + BIKES.length - 1) % BIKES.length
        break
      case 'garageNext':
        this.garageBikeIndex = (this.garageBikeIndex + 1) % BIKES.length
        break
      case 'buyOrSelect': {
        const b = BIKES[this.garageBikeIndex]
        if (this.save.ownedBikes.includes(b.id)) {
          this.save.currentBike = b.id
          this.bike = b
          this.sprites = buildSprites(b.color, b.accent)
          writeSave(this.save)
        } else if (this.save.money >= b.price) {
          this.save.money -= b.price
          this.save.ownedBikes.push(b.id)
          this.save.currentBike = b.id
          this.bike = b
          this.sprites = buildSprites(b.color, b.accent)
          audio.fanfare()
          writeSave(this.save)
        } else {
          this.setMessage('NOT ENOUGH CASH', 1.5)
        }
        break
      }
      case 'trackPrev':
        this.selectedTrack = (this.selectedTrack + TRACKS.length - 1) % TRACKS.length
        break
      case 'trackNext':
        this.selectedTrack = (this.selectedTrack + 1) % TRACKS.length
        break
      case 'startRace': {
        const t = TRACKS[this.selectedTrack]
        if (t.unlockAt <= this.save.careerProgress) this.startRace(t.id)
        else this.setMessage('LOCKED — WIN EARLIER RACES', 2)
        break
      }
      case 'resume':
        this.resumeRace()
        break
      case 'quitRace':
        this.screen = 'menu'
        break
      case 'retry':
        this.startRace(this.track.id)
        break
      case 'continue':
        this.screen = this.resultWin ? 'levelSelect' : 'menu'
        if (this.screen === 'levelSelect') this.selectedTrack = Math.min(this.save.careerProgress, TRACKS.length - 1)
        break
      case 'nextRace': {
        const next = Math.min(this.save.careerProgress, TRACKS.length - 1)
        this.selectedTrack = next
        this.screen = 'levelSelect'
        break
      }
    }
  }

  /** Hardware back button (Android). Returns true if the app should exit. */
  handleBack(): boolean {
    switch (this.screen) {
      case 'race':
        this.screen = 'paused'
        audio.stopEngine()
        return false
      case 'paused':
        this.resumeRace()
        return false
      case 'garage':
      case 'levelSelect':
      case 'help':
        this.screen = 'menu'
        return false
      case 'results':
      case 'gameover':
        this.screen = 'menu'
        return false
      case 'menu':
        this.screen = 'title'
        return false
      default:
        return true // title → exit app
    }
  }

  // ───────────────────────── Rendering ─────────────────────────
  render(): void {
    if (this.screen === 'race') return // race renders inside update for timing
    const c = this.ctx
    c.clearRect(0, 0, this.W, this.H)
    this.buttons = []
    switch (this.screen) {
      case 'title':
        this.renderTitle()
        break
      case 'menu':
        this.renderMenu()
        break
      case 'garage':
        this.renderGarage()
        break
      case 'levelSelect':
        this.renderLevelSelect()
        break
      case 'paused':
        this.renderRace()
        this.renderPaused()
        break
      case 'results':
        this.renderResults()
        break
      case 'gameover':
        this.renderGameOver()
        break
      case 'help':
        this.renderHelp()
        break
      default:
        this.renderTitle()
    }
    if (this.messageTimer > 0 && this.screen !== 'paused') this.renderToast()
  }

  private bgGradient(): void {
    const c = this.ctx
    const g = c.createLinearGradient(0, 0, 0, this.H)
    g.addColorStop(0, COLORS.sky)
    g.addColorStop(0.55, COLORS.skyLow)
    g.addColorStop(0.75, COLORS.haze)
    g.addColorStop(0.76, '#15351f')
    g.addColorStop(1, '#0c220f')
    c.fillStyle = g
    c.fillRect(0, 0, this.W, this.H)
  }

  private renderRace(): void {
    const c = this.ctx
    const p = this.player
    const W = this.W
    const H = this.H
    // sky + horizon
    const horizon = H * 0.42
    const seg = this.road.segmentAt(p.z)
    const sky = c.createLinearGradient(0, 0, 0, horizon)
    sky.addColorStop(0, COLORS.sky)
    sky.addColorStop(1, COLORS.skyLow)
    c.fillStyle = sky
    c.fillRect(0, 0, W, horizon)
    // sun haze
    c.fillStyle = COLORS.haze
    c.globalAlpha = 0.6
    c.beginPath()
    c.arc(W * 0.5 - seg.curve * 12, horizon, 90 * this.scale, 0, Math.PI * 2)
    c.fill()
    c.globalAlpha = 1
    // distant ground
    c.fillStyle = '#103018'
    c.fillRect(0, horizon - 1, W, H - horizon)

    this.baseIndex = Math.floor(p.z / SEG_LENGTH)

    // road + scenery
    this.road.render(c, W, H, this.cameraDepth, p.z, p.x, (sx, sy, sw, offset, rs) => {
      let sprite: Sprite
      if (rs.source === 'tree') sprite = this.sprites.trees[rs.index]
      else if (rs.source === 'sign') sprite = this.sprites.signs[rs.index]
      else sprite = this.sprites.rocks[rs.index]
      this.blit(sprite, sx, sy, sw, offset)
    })

    // entities sorted far → near
    type Ent = { z: number; draw: () => void }
    const ents: Ent[] = []
    for (const w of this.weapons) {
      if (w.taken) continue
      ents.push({ z: w.z, draw: () => this.renderEntity(this.sprites.weapon, w.z, w.x, 1) })
    }
    for (const t of this.traffic) {
      ents.push({ z: t.z, draw: () => this.renderEntity(this.sprites.cars[t.spriteIndex], t.z, t.x, 1) })
    }
    for (const rv of this.rivals) {
      ents.push({
        z: rv.z,
        draw: () => {
          const leanIdx = clamp(Math.round(rv.lean) + 2, 0, 4)
          const spr = rv.down ? this.sprites.crashed : this.sprites.rivalBikes[rv.colorIndex][leanIdx]
          this.renderEntity(spr, rv.z, rv.x, rv.staggerTimer > 0 || rv.swingTimer > 0 ? 1.08 : 1)
        },
      })
    }
    ents.sort((a, b) => b.z - a.z)
    for (const e of ents) e.draw()

    // player bike (fixed near bottom)
    this.renderPlayer()

    // HUD
    this.renderHUD()

    if (this.hitFlash > 0) {
      c.fillStyle = `rgba(255,40,40,${this.hitFlash})`
      c.fillRect(0, 0, W, H)
    }
    if (this.countdown > 0) this.renderCountdown()
    if (this.messageTimer > 0) this.renderToast()
  }

  /** Draw a scenery sprite given a segment's projected screen frame. */
  private blit(sprite: Sprite, segScreenX: number, segScreenY: number, segScreenW: number, offset: number): void {
    if (segScreenW <= 0) return
    const destW = sprite.w * SPRITES_SCALE * segScreenW
    const destH = sprite.h * SPRITES_SCALE * segScreenW
    if (destW < 1) return
    const destX = segScreenX + offset * segScreenW - destW / 2
    const destY = segScreenY - destH
    this.ctx.drawImage(sprite.canvas, destX, destY, destW, destH)
  }

  /** Draw a dynamic entity at world-z by interpolating between segment frames. */
  private renderEntity(sprite: Sprite, ez: number, offset: number, sizeMul: number): void {
    const segIndex = Math.floor(ez / SEG_LENGTH)
    const i = segIndex - this.baseIndex
    if (i < 0 || i >= DRAW_DISTANCE - 1) return
    const segs = this.road.segments
    if (segIndex < 0 || segIndex + 1 >= segs.length) return
    const a = segs[segIndex].p1.screen
    const b = segs[segIndex + 1].p1.screen
    if (a.w <= 0 || a.scale <= 0) return
    const frac = (ez - segIndex * SEG_LENGTH) / SEG_LENGTH
    const sx = lerp(a.x, b.x, frac)
    const sy = lerp(a.y, b.y, frac)
    const sw = lerp(a.w, b.w, frac)
    if (sw <= 0) return
    const destW = sprite.w * SPRITES_SCALE * sw * sizeMul
    const destH = sprite.h * SPRITES_SCALE * sw * sizeMul
    if (destW < 1) return
    const destX = sx + offset * sw - destW / 2
    const destY = sy - destH
    this.ctx.drawImage(sprite.canvas, destX, destY, destW, destH)
  }

  private renderPlayer(): void {
    const c = this.ctx
    const p = this.player
    const W = this.W
    const H = this.H
    let leanIdx = clamp(Math.round(p.lean) + 2, 0, 4)
    let spr: Sprite = this.sprites.playerBike[leanIdx]
    const baseW = W * 0.22 * clamp(this.scale, 0.8, 1.6)
    const w = baseW
    const h = (spr.h / spr.w) * w
    const bounce = Math.sin(this.flashTimer * 30) * (Math.abs(p.x) > 1.9 ? 5 : 1.5) * (p.speed > 0 ? 1 : 0)
    let x = W / 2 + p.lean * 10 * this.scale - w / 2
    const y = H - h - 10 * this.scale + bounce

    if (p.crashTimer > 0) {
      spr = this.sprites.crashed
      const cw = w * 1.1
      const ch = (spr.h / spr.w) * cw
      c.save()
      c.translate(W / 2, H - ch)
      c.rotate(Math.sin(this.flashTimer * 8) * 0.1)
      c.drawImage(spr.canvas, -cw / 2, 0, cw, ch)
      c.restore()
      return
    }
    void leanIdx
    // arm swing on attack — nudge sprite
    if (p.attackL > 0) x -= 8 * this.scale
    if (p.attackR > 0) x += 8 * this.scale
    c.drawImage(spr.canvas, x, y, w, h)
    // weapon glint in hand
    if (p.weapon > 0) {
      c.fillStyle = '#c9ced4'
      c.fillRect(x + w * (p.attackR > 0 ? 0.8 : 0.16), y + h * 0.3, 5 * this.scale, 26 * this.scale)
    }
    // attack arc
    if (p.attackL > 0 || p.attackR > 0) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'
      c.lineWidth = 3 * this.scale
      const side = p.attackL > 0 ? -1 : 1
      c.beginPath()
      c.arc(W / 2 + side * w * 0.4, y + h * 0.4, w * 0.3, side < 0 ? Math.PI * 0.7 : Math.PI * 0.1, side < 0 ? Math.PI * 1.2 : Math.PI * 0.6)
      c.stroke()
    }
  }

  // ───────────────────────── HUD ─────────────────────────
  private renderHUD(): void {
    const c = this.ctx
    const p = this.player
    const s = this.scale
    const W = this.W
    // speed
    const mph = Math.round(p.speed * MPH_PER_UNIT)
    c.textAlign = 'left'
    c.textBaseline = 'top'
    // panel top-left: position + progress
    panel(c, 10 * s, 10 * s, 150 * s, 56 * s, 10 * s)
    c.fillStyle = '#fff'
    c.font = `800 ${Math.round(15 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`POS ${p.place}/${this.rivals.length + 1}`, 22 * s, 18 * s)
    c.font = `700 ${Math.round(12 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#ffd23b'
    c.fillText(fmtTime(this.raceTime), 22 * s, 40 * s)
    // progress bar
    const prog = clamp(p.z / this.road.trackLength, 0, 1)
    c.fillStyle = 'rgba(255,255,255,0.25)'
    c.fillRect(95 * s, 42 * s, 56 * s, 8 * s)
    c.fillStyle = '#46d369'
    c.fillRect(95 * s, 42 * s, 56 * s * prog, 8 * s)

    // speedo bottom-center
    c.textAlign = 'center'
    c.fillStyle = '#fff'
    c.font = `900 ${Math.round(30 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`${mph}`, W / 2, this.H - 44 * s)
    c.font = `700 ${Math.round(12 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#ffd23b'
    c.fillText('MPH', W / 2, this.H - 16 * s)

    // stamina bar top-right (under pause)
    const sw = 150 * s
    panel(c, W - sw - 10 * s, 10 * s, sw, 30 * s, 8 * s)
    c.fillStyle = 'rgba(255,255,255,0.2)'
    c.fillRect(W - sw + 2 * s, 20 * s, sw - 58 * s, 10 * s)
    const stam = clamp(p.stamina / 100, 0, 1)
    c.fillStyle = stam > 0.4 ? '#46d369' : '#e84a4a'
    c.fillRect(W - sw + 2 * s, 20 * s, (sw - 58 * s) * stam, 10 * s)
    c.fillStyle = '#fff'
    c.textAlign = 'left'
    c.font = `700 ${Math.round(10 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('HEALTH', W - sw + 2 * s, 12 * s)
    if (p.weapon > 0) {
      c.fillStyle = '#ffd23b'
      c.textAlign = 'right'
      c.fillText(`PIPE x${p.weapon}`, W - 14 * s, 14 * s)
    }

    // pause button top-right corner
    c.fillStyle = 'rgba(0,0,0,0.4)'
    c.fillRect(W - 56 * s, 46 * s, 44 * s, 30 * s)
    c.fillStyle = '#fff'
    c.fillRect(W - 44 * s, 52 * s, 6 * s, 18 * s)
    c.fillRect(W - 32 * s, 52 * s, 6 * s, 18 * s)

    // touch controls overlay
    this.renderTouchControls()

    // mini standings
    this.renderStandings()
  }

  private renderStandings(): void {
    const c = this.ctx
    const s = this.scale
    if (this.W < 520) return // skip on small screens
    const racers: Array<{ name: string; prog: number; me: boolean }> = [
      { name: 'YOU', prog: this.player.finished ? 1e9 - this.player.finishTime + this.road.trackLength : this.player.z, me: true },
    ]
    for (const rv of this.rivals) racers.push({ name: rv.name, prog: rv.finished ? 1e9 - rv.finishTime + this.road.trackLength : rv.z, me: false })
    racers.sort((a, b) => b.prog - a.prog)
    const x = this.W - 150 * s
    const y = 48 * s
    c.textAlign = 'left'
    racers.forEach((r, i) => {
      c.font = `${r.me ? 800 : 600} ${Math.round(11 * s)}px 'Trebuchet MS', sans-serif`
      c.fillStyle = r.me ? '#ffd23b' : 'rgba(255,255,255,0.8)'
      c.fillText(`${i + 1}. ${r.name}`, x, y + i * 14 * s)
    })
  }

  private renderTouchControls(): void {
    const c = this.ctx
    const controls = this.input.controls
    if (!controls.length) return
    const draw = (id: string, label: string, glyph?: string) => {
      const ctl = controls.find((k) => k.id === id)
      if (!ctl) return
      const active =
        (id === 'left' && this.input.state.steer < -0.1) ||
        (id === 'right' && this.input.state.steer > 0.1) ||
        (id === 'gas' && this.input.state.throttle) ||
        (id === 'brake' && this.input.state.brake) ||
        (id === 'hitL' && this.input.state.attackLeft) ||
        (id === 'hitR' && this.input.state.attackRight)
      c.beginPath()
      c.arc(ctl.cx, ctl.cy, ctl.r, 0, Math.PI * 2)
      c.fillStyle = active ? 'rgba(255,138,61,0.55)' : 'rgba(20,24,36,0.42)'
      c.fill()
      c.lineWidth = 2
      c.strokeStyle = 'rgba(255,255,255,0.4)'
      c.stroke()
      c.fillStyle = '#fff'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.font = `800 ${Math.round(ctl.r * 0.6)}px 'Trebuchet MS', sans-serif`
      c.fillText(glyph ?? label, ctl.cx, ctl.cy)
    }
    draw('left', '', '◀')
    draw('right', '', '▶')
    draw('gas', '', '▲')
    draw('brake', '', '▼')
    draw('hitL', 'L', '✊')
    draw('hitR', 'R', '✊')
  }

  private renderCountdown(): void {
    const c = this.ctx
    const n = Math.ceil(this.countdown)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = n === 0 ? '#46d369' : '#ffd23b'
    c.font = `900 ${Math.round(90 * this.scale)}px 'Trebuchet MS', sans-serif`
    c.strokeStyle = 'rgba(0,0,0,0.6)'
    c.lineWidth = 6 * this.scale
    const label = n <= 0 ? 'GO!' : `${n}`
    c.strokeText(label, this.W / 2, this.H * 0.38)
    c.fillText(label, this.W / 2, this.H * 0.38)
  }

  private renderToast(): void {
    const c = this.ctx
    const s = this.scale
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const w = Math.min(this.W * 0.8, 320 * s)
    const x = this.W / 2 - w / 2
    const y = this.H * 0.6
    panel(c, x, y, w, 40 * s, 10 * s)
    c.fillStyle = '#ffd23b'
    c.font = `800 ${Math.round(18 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(this.message, this.W / 2, y + 20 * s)
  }

  // ───────────────────────── Screens ─────────────────────────
  private titleBg(): void {
    this.bgGradient()
    // a stylised road stripe down the middle
    const c = this.ctx
    c.fillStyle = 'rgba(0,0,0,0.25)'
    c.beginPath()
    c.moveTo(this.W * 0.35, this.H)
    c.lineTo(this.W * 0.47, this.H * 0.5)
    c.lineTo(this.W * 0.53, this.H * 0.5)
    c.lineTo(this.W * 0.65, this.H)
    c.closePath()
    c.fill()
  }

  private renderTitle(): void {
    const c = this.ctx
    this.titleBg()
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const s = this.scale
    c.save()
    c.translate(this.W / 2, this.H * 0.32)
    c.rotate(-0.04)
    c.font = `900 italic ${Math.round(60 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#ffd23b'
    c.strokeStyle = '#7a2d00'
    c.lineWidth = 6 * s
    c.strokeText('ROAD REBELS', 0, 0)
    c.fillText('ROAD REBELS', 0, 0)
    c.restore()
    c.font = `700 ${Math.round(18 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#fff'
    c.fillText('Motorcycle Combat Racing', this.W / 2, this.H * 0.32 + 50 * s)
    c.font = `700 ${Math.round(16 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = this.flashTimer % 1 < 0.6 ? '#ffd23b' : 'rgba(255,255,255,0.5)'
    c.fillText('TAP TO START', this.W / 2, this.H * 0.74)
    c.font = `600 ${Math.round(11 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = 'rgba(255,255,255,0.6)'
    c.fillText('An original game inspired by classic moto-combat racers', this.W / 2, this.H - 20 * s)
  }

  private centeredButtons(labels: Array<{ id: string; label: string; sub?: string; disabled?: boolean; danger?: boolean }>, startY: number): void {
    const s = this.scale
    const bw = Math.min(this.W * 0.7, 300 * s)
    const bh = 48 * s
    const gap = 14 * s
    labels.forEach((l, i) => {
      this.buttons.push({ id: l.id, x: this.W / 2 - bw / 2, y: startY + i * (bh + gap), w: bw, h: bh, label: l.label, sub: l.sub, disabled: l.disabled, danger: l.danger })
    })
  }

  private renderMenu(): void {
    const c = this.ctx
    this.titleBg()
    c.textAlign = 'center'
    c.fillStyle = '#ffd23b'
    const s = this.scale
    c.font = `900 italic ${Math.round(40 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('ROAD REBELS', this.W / 2, this.H * 0.16)
    c.font = `700 ${Math.round(14 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#fff'
    c.fillText(`$${this.save.money.toLocaleString()}   •   Wins ${this.save.wins}/${this.save.races}`, this.W / 2, this.H * 0.16 + 34 * s)

    this.centeredButtons(
      [
        { id: 'career', label: 'RACE', sub: 'Career — earn cash & bikes' },
        { id: 'garage', label: 'GARAGE', sub: `Bike: ${getBike(this.save.currentBike).name}` },
        { id: 'help', label: 'HOW TO PLAY' },
      ],
      this.H * 0.32
    )
    // settings row
    const s2 = this.scale
    const bw = Math.min(this.W * 0.7, 300 * s2)
    const y = this.H * 0.32 + 3 * (48 * s2 + 14 * s2) + 6 * s2
    this.buttons.push({ id: 'soundToggle', x: this.W / 2 - bw / 2, y, w: bw / 2 - 6 * s2, h: 40 * s2, label: this.save.settings.sound ? 'SOUND: ON' : 'SOUND: OFF' })
    this.buttons.push({ id: 'tiltToggle', x: this.W / 2 + 6 * s2, y, w: bw / 2 - 6 * s2, h: 40 * s2, label: this.save.settings.tilt ? 'TILT: ON' : 'TILT: OFF' })

    for (const b of this.buttons) drawButton(c, b, s)
  }

  private renderGarage(): void {
    const c = this.ctx
    this.bgGradient()
    const s = this.scale
    const bike = BIKES[this.garageBikeIndex]
    const owned = this.save.ownedBikes.includes(bike.id)
    const selected = this.save.currentBike === bike.id
    c.textAlign = 'center'
    c.fillStyle = '#ffd23b'
    c.font = `900 ${Math.round(30 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('GARAGE', this.W / 2, this.H * 0.1)
    c.fillStyle = '#fff'
    c.font = `700 ${Math.round(14 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`$${this.save.money.toLocaleString()}`, this.W / 2, this.H * 0.1 + 26 * s)

    // bike preview
    const preview = buildSprites(bike.color, bike.accent).playerBike[2]
    const pw = Math.min(this.W * 0.4, 200 * s)
    const ph = (preview.h / preview.w) * pw
    c.drawImage(preview.canvas, this.W / 2 - pw / 2, this.H * 0.2, pw, ph)

    c.fillStyle = '#fff'
    c.font = `800 ${Math.round(24 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(bike.name, this.W / 2, this.H * 0.2 + ph + 24 * s)

    // stats bars
    const stats: Array<[string, number]> = [
      ['SPEED', bike.topSpeed / 1.12],
      ['ACCEL', bike.accel / 1.2],
      ['GRIP', bike.grip / 1.12],
      ['TOUGH', bike.toughness / 1.35],
    ]
    const sx = this.W / 2 - 110 * s
    let sy = this.H * 0.2 + ph + 44 * s
    c.textAlign = 'left'
    c.font = `700 ${Math.round(12 * s)}px 'Trebuchet MS', sans-serif`
    for (const [label, val] of stats) {
      c.fillStyle = '#fff'
      c.fillText(label, sx, sy)
      c.fillStyle = 'rgba(255,255,255,0.2)'
      c.fillRect(sx + 60 * s, sy - 9 * s, 140 * s, 10 * s)
      c.fillStyle = '#ff8a3d'
      c.fillRect(sx + 60 * s, sy - 9 * s, 140 * s * clamp(val, 0.05, 1), 10 * s)
      sy += 20 * s
    }

    // nav + action buttons
    const by = this.H - 70 * s
    this.buttons.push({ id: 'garagePrev', x: this.W / 2 - 150 * s, y: by, w: 50 * s, h: 48 * s, label: '◀' })
    this.buttons.push({ id: 'garageNext', x: this.W / 2 + 100 * s, y: by, w: 50 * s, h: 48 * s, label: '▶' })
    const action = selected ? 'EQUIPPED' : owned ? 'SELECT' : `BUY $${bike.price.toLocaleString()}`
    this.buttons.push({ id: 'buyOrSelect', x: this.W / 2 - 90 * s, y: by, w: 180 * s, h: 48 * s, label: action, disabled: selected || (!owned && this.save.money < bike.price) })
    this.buttons.push({ id: 'back', x: 14 * s, y: 14 * s, w: 90 * s, h: 38 * s, label: '‹ BACK' })
    for (const b of this.buttons) drawButton(c, b, s)
  }

  private renderLevelSelect(): void {
    const c = this.ctx
    this.bgGradient()
    const s = this.scale
    const t = TRACKS[this.selectedTrack]
    const locked = t.unlockAt > this.save.careerProgress
    c.textAlign = 'center'
    c.fillStyle = '#ffd23b'
    c.font = `900 ${Math.round(28 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('SELECT RACE', this.W / 2, this.H * 0.1)

    panel(c, this.W / 2 - 160 * s, this.H * 0.2, 320 * s, 150 * s, 14 * s)
    c.fillStyle = locked ? '#888' : '#fff'
    c.font = `800 ${Math.round(26 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`${this.selectedTrack + 1}. ${t.name}`, this.W / 2, this.H * 0.2 + 34 * s)
    c.font = `600 ${Math.round(14 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = 'rgba(255,255,255,0.8)'
    c.fillText(t.location, this.W / 2, this.H * 0.2 + 60 * s)
    c.font = `700 ${Math.round(13 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#ffd23b'
    c.fillText(`Prize $${t.prize.toLocaleString()}   •   Rivals ${t.rivals}`, this.W / 2, this.H * 0.2 + 84 * s)
    const diff = '★'.repeat(Math.round(1 + t.difficulty * 4)) + '☆'.repeat(5 - Math.round(1 + t.difficulty * 4))
    c.fillStyle = '#fff'
    c.fillText(`Difficulty ${diff}`, this.W / 2, this.H * 0.2 + 106 * s)
    const best = this.save.bestTimes[t.id]
    if (best != null) c.fillText(`Best ${fmtTime(best)}`, this.W / 2, this.H * 0.2 + 128 * s)
    if (locked) {
      c.fillStyle = '#e84a4a'
      c.font = `800 ${Math.round(16 * s)}px 'Trebuchet MS', sans-serif`
      c.fillText('🔒 LOCKED', this.W / 2, this.H * 0.2 + 128 * s)
    }

    const by = this.H - 74 * s
    this.buttons.push({ id: 'trackPrev', x: this.W / 2 - 170 * s, y: by, w: 50 * s, h: 50 * s, label: '◀' })
    this.buttons.push({ id: 'trackNext', x: this.W / 2 + 120 * s, y: by, w: 50 * s, h: 50 * s, label: '▶' })
    this.buttons.push({ id: 'startRace', x: this.W / 2 - 100 * s, y: by, w: 200 * s, h: 50 * s, label: locked ? 'LOCKED' : 'RACE!', disabled: locked })
    this.buttons.push({ id: 'back', x: 14 * s, y: 14 * s, w: 90 * s, h: 38 * s, label: '‹ BACK' })
    for (const b of this.buttons) drawButton(c, b, s)
  }

  private renderPaused(): void {
    const c = this.ctx
    const s = this.scale
    c.fillStyle = 'rgba(0,0,0,0.6)'
    c.fillRect(0, 0, this.W, this.H)
    c.textAlign = 'center'
    c.fillStyle = '#ffd23b'
    c.font = `900 ${Math.round(40 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('PAUSED', this.W / 2, this.H * 0.28)
    this.centeredButtons(
      [
        { id: 'resume', label: 'RESUME' },
        { id: 'retry', label: 'RESTART RACE' },
        { id: 'quitRace', label: 'QUIT TO MENU', danger: true },
      ],
      this.H * 0.4
    )
    for (const b of this.buttons) drawButton(c, b, s)
  }

  private renderResults(): void {
    const c = this.ctx
    this.bgGradient()
    const s = this.scale
    const p = this.player
    c.textAlign = 'center'
    c.fillStyle = this.resultWin ? '#ffd23b' : '#fff'
    c.font = `900 ${Math.round(44 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(this.resultWin ? 'WINNER!' : 'RACE OVER', this.W / 2, this.H * 0.16)

    panel(c, this.W / 2 - 150 * s, this.H * 0.26, 300 * s, 160 * s, 14 * s)
    c.fillStyle = '#fff'
    c.font = `800 ${Math.round(28 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`${ordinal(p.place)} PLACE`, this.W / 2, this.H * 0.26 + 36 * s)
    c.font = `700 ${Math.round(16 * s)}px 'Trebuchet MS', sans-serif`
    c.fillStyle = '#ffd23b'
    c.fillText(`Time ${fmtTime(p.finishTime)}`, this.W / 2, this.H * 0.26 + 68 * s)
    c.fillStyle = '#46d369'
    c.font = `800 ${Math.round(22 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`PRIZE  +$${this.resultPrize.toLocaleString()}`, this.W / 2, this.H * 0.26 + 100 * s)
    c.fillStyle = '#fff'
    c.font = `600 ${Math.round(13 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText(`Bank: $${this.save.money.toLocaleString()}   •   Takedowns bonus included`, this.W / 2, this.H * 0.26 + 128 * s)

    const labels = this.resultWin
      ? [
          { id: 'nextRace', label: 'NEXT RACE' },
          { id: 'garage', label: 'GARAGE' },
          { id: 'continue', label: 'CONTINUE' },
        ]
      : [
          { id: 'retry', label: 'RETRY' },
          { id: 'garage', label: 'GARAGE' },
          { id: 'continue', label: 'MENU' },
        ]
    this.centeredButtons(labels, this.H * 0.58)
    for (const b of this.buttons) drawButton(c, b, s)
  }

  private renderGameOver(): void {
    const c = this.ctx
    this.bgGradient()
    const s = this.scale
    this.save.busts++
    c.textAlign = 'center'
    c.fillStyle = '#e84a4a'
    c.font = `900 ${Math.round(48 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('BUSTED!', this.W / 2, this.H * 0.28)
    c.fillStyle = '#fff'
    c.font = `700 ${Math.round(16 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('Too many wrecks — you wiped out for good.', this.W / 2, this.H * 0.28 + 40 * s)
    this.centeredButtons(
      [
        { id: 'retry', label: 'TRY AGAIN' },
        { id: 'quitRace', label: 'QUIT TO MENU', danger: true },
      ],
      this.H * 0.46
    )
    for (const b of this.buttons) drawButton(c, b, s)
  }

  private renderHelp(): void {
    const c = this.ctx
    this.bgGradient()
    const s = this.scale
    c.textAlign = 'center'
    c.fillStyle = '#ffd23b'
    c.font = `900 ${Math.round(30 * s)}px 'Trebuchet MS', sans-serif`
    c.fillText('HOW TO PLAY', this.W / 2, this.H * 0.1)
    const lines = [
      'GOAL: Win races to earn cash, buy faster bikes,',
      'and climb the career ladder to the Grand Final.',
      '',
      'TOUCH:  ◀ ▶ steer  •  ▲ gas  •  ▼ brake',
      '✊ left / right  =  punch the rider on that side',
      '',
      'KEYBOARD:  Arrows / WASD to ride',
      'Z = hit left   X = hit right   P = pause',
      '',
      'COMBAT: pull alongside a rival and hit them to',
      'drain their health. Knock them down for a bounty.',
      'Grab a PIPE on the road for harder hits.',
      '',
      'Avoid traffic, stay on the asphalt, and don’t',
      'wreck too many times or you get BUSTED.',
    ]
    c.textAlign = 'center'
    c.font = `600 ${Math.round(14 * s)}px 'Trebuchet MS', sans-serif`
    lines.forEach((ln, i) => {
      c.fillStyle = ln.startsWith('GOAL') || ln.startsWith('COMBAT') || ln.startsWith('TOUCH') || ln.startsWith('KEYBOARD') ? '#ffd23b' : '#fff'
      c.fillText(ln, this.W / 2, this.H * 0.18 + i * 18 * s)
    })
    this.buttons.push({ id: 'back', x: this.W / 2 - 70 * s, y: this.H - 60 * s, w: 140 * s, h: 44 * s, label: 'BACK' })
    this.buttons.push({ id: 'resetSave', x: this.W - 130 * s, y: 14 * s, w: 116 * s, h: 34 * s, label: 'RESET SAVE', danger: true })
    for (const b of this.buttons) drawButton(c, b, s)
  }
}
