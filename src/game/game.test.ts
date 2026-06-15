import { beforeAll, describe, expect, it } from 'vitest'
import { Game } from './game'
import { Input } from './input'
import { Road } from './road'
import { getTrack, BIKES, TRACKS } from './tracks'
import { clamp, fmtTime, makeRng, ordinal, wrap } from './util'

// ── Stub a 2D canvas context so the game can run headless under jsdom. ──
function fakeCtx(): CanvasRenderingContext2D {
  const grad = { addColorStop() {} }
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => grad
      if (prop === 'measureText') return () => ({ width: 10 })
      if (prop === 'getImageData') return () => ({ data: [] })
      if (prop === 'canvas') return { width: 800, height: 450 }
      return () => undefined
    },
    set() {
      return true
    },
  }
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D
}

beforeAll(() => {
  // jsdom has no canvas backend — route every getContext to our stub.
  HTMLCanvasElement.prototype.getContext = (() => fakeCtx()) as unknown as HTMLCanvasElement['getContext']
})

function makeGame(): { game: Game; input: Input } {
  const canvas = document.createElement('canvas')
  const input = new Input()
  const game = new Game(canvas, input)
  return { game, input }
}

describe('pure helpers', () => {
  it('clamps and wraps', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(wrap(-1, 4)).toBe(3)
    expect(wrap(5, 4)).toBe(1)
  })
  it('formats time and ordinals', () => {
    expect(fmtTime(0)).toBe('0:00.0')
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
  })
  it('rng is deterministic for a seed', () => {
    const a = makeRng(42)
    const b = makeRng(42)
    expect(a()).toBeCloseTo(b())
    expect(a()).toBeCloseTo(b())
  })
})

describe('road generation', () => {
  it('builds the requested number of segments with a finite length', () => {
    const road = new Road()
    const track = getTrack('t2')
    road.build(track)
    expect(road.segments.length).toBeGreaterThanOrEqual(track.length)
    expect(road.trackLength).toBeGreaterThan(0)
    // segmentAt should always resolve to a real segment
    const seg = road.segmentAt(road.trackLength * 0.5)
    expect(seg).toBeDefined()
    expect(typeof seg.curve).toBe('number')
  })
  it('is deterministic for the same seed', () => {
    const a = new Road()
    const b = new Road()
    a.build(getTrack('t1'))
    b.build(getTrack('t1'))
    expect(a.segments.length).toBe(b.segments.length)
    expect(a.segments[200].curve).toBe(b.segments[200].curve)
  })
})

describe('catalogue', () => {
  it('has escalating bike prices and unlockable tracks', () => {
    for (let i = 1; i < BIKES.length; i++) expect(BIKES[i].price).toBeGreaterThan(BIKES[i - 1].price)
    expect(TRACKS[0].unlockAt).toBe(0)
    expect(TRACKS.at(-1)!.prize).toBeGreaterThan(TRACKS[0].prize)
  })
})

describe('game loop (headless)', () => {
  it('initialises to the title screen and renders menus without throwing', async () => {
    const { game } = makeGame()
    await game.init()
    game.resize(900, 500)
    expect(game.screen).toBe('title')
    for (const s of ['title', 'menu', 'garage', 'levelSelect', 'help'] as const) {
      ;(game as unknown as { screen: string }).screen = s
      expect(() => game.render()).not.toThrow()
    }
  })

  it('runs a full race to completion and reaches the results screen', async () => {
    const { game, input } = makeGame()
    await game.init()
    game.resize(900, 500)
    // Start a race directly and hold the throttle for the whole run.
    ;(game as unknown as { startRace(id: string): void }).startRace('t1')
    expect(game.screen).toBe('race')
    const keys = (input as unknown as { keys: Set<string> }).keys
    keys.add('arrowup')

    let frames = 0
    while (game.screen === 'race' && frames < 4000) {
      if (frames % 90 < 30) keys.add('arrowright')
      else keys.delete('arrowright')
      if (frames % 50 === 0) keys.add('x')
      else keys.delete('x')
      game.update(0.05)
      game.render()
      frames++
    }
    // The race must terminate (finish, or busted) — never hang.
    expect(['results', 'gameover']).toContain(game.screen)
  })

  it('handles the hardware back button across screens', async () => {
    const { game } = makeGame()
    await game.init()
    ;(game as unknown as { screen: string }).screen = 'menu'
    expect(game.handleBack()).toBe(false) // menu → title
    expect(game.screen).toBe('title')
    expect(game.handleBack()).toBe(true) // title → exit
  })
})
