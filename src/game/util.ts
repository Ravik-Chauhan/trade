// Small math + helper utilities used across the game engine.

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const approach = (current: number, target: number, increment: number): number => {
  if (current < target) return Math.min(current + increment, target)
  if (current > target) return Math.max(current - increment, target)
  return target
}

export const easeIn = (a: number, b: number, p: number): number => a + (b - a) * Math.pow(p, 2)
export const easeOut = (a: number, b: number, p: number): number => a + (b - a) * (1 - Math.pow(1 - p, 2))
export const easeInOut = (a: number, b: number, p: number): number =>
  a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5)

export const rand = (min: number, max: number): number => min + Math.random() * (max - min)
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1))
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** A small, fast, seedable PRNG (mulberry32) for deterministic track layouts. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const fmtTime = (seconds: number): string => {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const rem = s - m * 60
  return `${m}:${rem.toFixed(1).padStart(4, '0')}`
}

export const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Wrap a value into [0, max). */
export const wrap = (v: number, max: number): number => {
  let r = v % max
  if (r < 0) r += max
  return r
}
