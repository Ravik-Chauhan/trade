import type { SaveData } from './types'

const KEY = 'roadrebels.save.v1'

const DEFAULTS: SaveData = {
  money: 0,
  ownedBikes: ['rookie'],
  currentBike: 'rookie',
  careerProgress: 0,
  bestTimes: {},
  wins: 0,
  races: 0,
  busts: 0,
  settings: { sound: true, tilt: false },
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<SaveData>
    return {
      ...DEFAULTS,
      ...parsed,
      ownedBikes: parsed.ownedBikes?.length ? parsed.ownedBikes : [...DEFAULTS.ownedBikes],
      bestTimes: parsed.bestTimes ?? {},
      settings: { ...DEFAULTS.settings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable — ignore */
  }
}

export function resetSave(): SaveData {
  const fresh = { ...DEFAULTS, ownedBikes: [...DEFAULTS.ownedBikes], bestTimes: {} }
  writeSave(fresh)
  return fresh
}
