// Shared types for the game.

export interface BikeSpec {
  id: string
  name: string
  price: number
  topSpeed: number // multiplier on MAX_SPEED (0..1.1)
  accel: number // multiplier on ACCEL
  grip: number // 0.7..1.2, resistance to curve drift + off-road
  toughness: number // stamina multiplier in combat
  color: string
  accent: string
}

export interface TrackSpec {
  id: string
  name: string
  location: string
  seed: number
  length: number // number of segments
  rivals: number
  difficulty: number // 0..1 affects rival speed + aggression
  prize: number // money for winning
  unlockAt: number // career race index needed to unlock
  hilliness: number
  curviness: number
  traffic: number // density 0..1
}

export type Screen =
  | 'loading'
  | 'title'
  | 'menu'
  | 'garage'
  | 'levelSelect'
  | 'preRace'
  | 'race'
  | 'results'
  | 'paused'
  | 'gameover'
  | 'help'

export interface Button {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  sub?: string
  disabled?: boolean
  danger?: boolean
}

export interface SaveData {
  money: number
  ownedBikes: string[]
  currentBike: string
  careerProgress: number // index of next race to win
  bestTimes: Record<string, number>
  wins: number
  races: number
  busts: number
  settings: { sound: boolean; tilt: boolean }
}
