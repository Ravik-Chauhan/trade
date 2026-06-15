import {
  COLORS,
  DRAW_DISTANCE,
  FOG_DENSITY,
  ROAD_WIDTH,
  RUMBLE_LENGTH,
  SEG_LENGTH,
  type RoadColors,
} from './config'
import type { TrackSpec } from './types'
import { easeIn, easeInOut, makeRng } from './util'

export interface RoadSprite {
  source: 'tree' | 'sign' | 'rock'
  index: number
  offset: number // -1 left .. 1 right (in road widths)
}

export interface Segment {
  index: number
  p1: { world: { x: number; y: number; z: number }; cam: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } }
  p2: { world: { x: number; y: number; z: number }; cam: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } }
  curve: number
  colors: RoadColors
  sprites: RoadSprite[]
  // World decoration that lives on this segment (filled by the game): traffic,
  // rivals and weapons are tracked separately, but scenery is baked here.
}

const point = () => ({
  world: { x: 0, y: 0, z: 0 },
  cam: { x: 0, y: 0, z: 0 },
  screen: { x: 0, y: 0, w: 0, scale: 0 },
})

export class Road {
  segments: Segment[] = []
  trackLength = 0

  build(track: TrackSpec): void {
    this.segments = []
    const rng = makeRng(track.seed)
    const n = track.length

    const addSegment = (curve: number, yy: number) => {
      const i = this.segments.length
      const seg: Segment = {
        index: i,
        p1: point(),
        p2: point(),
        curve,
        colors:
          Math.floor(i / RUMBLE_LENGTH) % 2 ? COLORS.dark : COLORS.light,
        sprites: [],
      }
      seg.p1.world.z = i * SEG_LENGTH
      seg.p2.world.z = (i + 1) * SEG_LENGTH
      seg.p1.world.y = this.segments.length ? this.segments[i - 1].p2.world.y : 0
      seg.p2.world.y = yy
      this.segments.push(seg)
    }

    const addRoad = (enter: number, hold: number, leave: number, curve: number, hill: number) => {
      const startY = this.lastY()
      const endY = startY + hill * SEG_LENGTH
      const total = enter + hold + leave
      for (let i = 0; i < enter; i++) addSegment(easeIn(0, curve, i / enter), easeInOut(startY, endY, i / total))
      for (let i = 0; i < hold; i++) addSegment(curve, easeInOut(startY, endY, (enter + i) / total))
      for (let i = 0; i < leave; i++) addSegment(easeInOut(curve, 0, i / leave), easeInOut(startY, endY, (enter + hold + i) / total))
    }

    // Start straight + grid.
    for (let i = 0; i < 30; i++) addSegment(0, 0)

    while (this.segments.length < n) {
      const r = rng()
      const len = 30 + Math.floor(rng() * 80)
      const curveAmt = (rng() * 5 + 1) * track.curviness
      const curve = (rng() < 0.5 ? -1 : 1) * curveAmt
      const hill = (rng() * 2 - 1) * 40 * track.hilliness
      if (r < 0.18) {
        // straight (flat or rolling)
        addRoad(len * 0.3, len, len * 0.3, 0, hill)
      } else if (r < 0.6) {
        addRoad(len * 0.4, len, len * 0.4, curve, hill * 0.4)
      } else {
        addRoad(len * 0.5, len * 0.6, len * 0.5, curve, hill)
      }
    }

    this.trackLength = this.segments.length * SEG_LENGTH

    // Start/finish colouring.
    for (let i = 0; i < 6; i++) this.segments[i].colors = i % 2 ? COLORS.start : COLORS.dark
    for (let i = this.segments.length - 6; i < this.segments.length; i++) {
      this.segments[i].colors = i % 2 ? COLORS.finish : COLORS.light
    }

    // Scatter scenery.
    for (let i = 40; i < this.segments.length - 8; i++) {
      const seg = this.segments[i]
      if (rng() < 0.22) {
        const side = rng() < 0.5 ? -1 : 1
        const offset = side * (1.4 + rng() * 1.8)
        const roll = rng()
        if (roll < 0.6) seg.sprites.push({ source: 'tree', index: rng() < 0.5 ? 0 : 1, offset })
        else if (roll < 0.78) seg.sprites.push({ source: 'rock', index: rng() < 0.5 ? 0 : 1, offset })
        else seg.sprites.push({ source: 'sign', index: Math.floor(rng() * 3), offset: side * 1.25 })
      }
    }
  }

  private lastY(): number {
    return this.segments.length ? this.segments[this.segments.length - 1].p2.world.y : 0
  }

  segmentAt(z: number): Segment {
    const len = this.segments.length
    return this.segments[Math.floor(z / SEG_LENGTH) % len]
  }

  /** Project a world point into camera + screen space. */
  static project(
    p: Segment['p1'],
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    cameraDepth: number,
    width: number,
    height: number,
    roadWidth: number
  ): void {
    p.cam.x = p.world.x - cameraX
    p.cam.y = p.world.y - cameraY
    p.cam.z = p.world.z - cameraZ
    const safeZ = p.cam.z === 0 ? 0.0001 : p.cam.z
    p.screen.scale = cameraDepth / safeZ
    p.screen.x = Math.round(width / 2 + (p.screen.scale * p.cam.x * width) / 2)
    p.screen.y = Math.round(height / 2 - (p.screen.scale * p.cam.y * height) / 2)
    p.screen.w = Math.round((p.screen.scale * roadWidth * width) / 2)
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraDepth: number,
    position: number,
    playerX: number,
    drawSprite: (screenX: number, screenY: number, screenW: number, offset: number, sprite: RoadSprite) => void
  ): { baseSegment: Segment; playerY: number } {
    const segs = this.segments
    const n = segs.length
    const baseIndex = Math.floor(position / SEG_LENGTH) % n
    const baseSegment = segs[baseIndex]
    const basePercent = (position % SEG_LENGTH) / SEG_LENGTH
    const playerSegY =
      baseSegment.p1.world.y + (baseSegment.p2.world.y - baseSegment.p1.world.y) * basePercent
    const cameraHeightWorld = playerSegY + 1050

    let maxY = height
    let x = 0
    let dx = -(baseSegment.curve * basePercent)

    // Sky / ground gradient handled by caller; here we draw road + scenery.
    const spriteQueue: Array<{ seg: Segment }> = []

    for (let i = 0; i < DRAW_DISTANCE; i++) {
      const seg = segs[(baseIndex + i) % n]
      const looped = baseIndex + i >= n
      const camZ = position - (looped ? this.trackLength : 0)

      Road.project(seg.p1, playerX * ROAD_WIDTH - x, cameraHeightWorld, camZ, cameraDepth, width, height, ROAD_WIDTH)
      Road.project(seg.p2, playerX * ROAD_WIDTH - x - dx, cameraHeightWorld, camZ, cameraDepth, width, height, ROAD_WIDTH)

      x += dx
      dx += seg.curve

      if (seg.p1.cam.z <= cameraDepth || seg.p2.screen.y >= maxY || seg.p2.screen.y >= seg.p1.screen.y) continue

      this.renderSegment(ctx, width, seg, i)
      spriteQueue.push({ seg })
      maxY = seg.p2.screen.y
    }

    // Draw scenery back-to-front (already pushed front-to-back → iterate reverse).
    for (let q = spriteQueue.length - 1; q >= 0; q--) {
      const seg = spriteQueue[q].seg
      for (const s of seg.sprites) {
        drawSprite(seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w, s.offset, s)
      }
    }

    return { baseSegment, playerY: 0 }
  }

  private renderSegment(ctx: CanvasRenderingContext2D, width: number, seg: Segment, depth: number): void {
    const c = seg.colors
    const r1 = seg.p1.screen
    const r2 = seg.p2.screen
    const fog = Math.min(1, Math.max(0, 1 - Math.exp((-(depth / DRAW_DISTANCE)) * FOG_DENSITY) ** 1))
    // grass band
    ctx.fillStyle = c.grass
    ctx.fillRect(0, r2.y, width, r1.y - r2.y)
    // rumble strips
    const rumble1 = r1.w / 5
    const rumble2 = r2.w / 5
    this.poly(ctx, r1.x - r1.w - rumble1, r1.y, r1.x - r1.w, r1.y, r2.x - r2.w, r2.y, r2.x - r2.w - rumble2, r2.y, c.rumble)
    this.poly(ctx, r1.x + r1.w + rumble1, r1.y, r1.x + r1.w, r1.y, r2.x + r2.w, r2.y, r2.x + r2.w + rumble2, r2.y, c.rumble)
    // road
    this.poly(ctx, r1.x - r1.w, r1.y, r1.x + r1.w, r1.y, r2.x + r2.w, r2.y, r2.x - r2.w, r2.y, c.road)
    // lane lines
    if (c.lane !== c.road) {
      const l1 = r1.w / 24
      const l2 = r2.w / 24
      const lanes = 3
      for (let li = 1; li < lanes; li++) {
        const lx1 = r1.x - r1.w + (r1.w * 2 * li) / lanes
        const lx2 = r2.x - r2.w + (r2.w * 2 * li) / lanes
        this.poly(ctx, lx1 - l1, r1.y, lx1 + l1, r1.y, lx2 + l2, r2.y, lx2 - l2, r2.y, c.lane)
      }
    }
    // fog overlay deep ahead
    if (fog > 0.02) {
      ctx.globalAlpha = fog
      ctx.fillStyle = COLORS.fog
      ctx.fillRect(0, r2.y, width, r1.y - r2.y + 1)
      ctx.globalAlpha = 1
    }
  }

  private poly(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string): void {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.lineTo(x4, y4)
    ctx.closePath()
    ctx.fill()
  }
}
