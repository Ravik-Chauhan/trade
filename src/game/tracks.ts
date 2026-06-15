import type { BikeSpec, TrackSpec } from './types'

// Player-purchasable bikes — original names, escalating performance and price.
export const BIKES: BikeSpec[] = [
  { id: 'rookie', name: 'Streetfox 250', price: 0, topSpeed: 0.78, accel: 0.85, grip: 1.05, toughness: 0.9, color: '#d23b3b', accent: '#ffd23b' },
  { id: 'sprint', name: 'Hornet 600', price: 4000, topSpeed: 0.88, accel: 1.0, grip: 1.0, toughness: 1.0, color: '#2f7be0', accent: '#e8f0ff' },
  { id: 'muscle', name: 'Bruiser 900', price: 11000, topSpeed: 0.95, accel: 0.92, grip: 0.92, toughness: 1.35, color: '#2b2b2b', accent: '#ff7a18' },
  { id: 'super', name: 'Wraith RR', price: 26000, topSpeed: 1.03, accel: 1.12, grip: 1.05, toughness: 1.1, color: '#00b894', accent: '#012e26' },
  { id: 'hyper', name: 'Phantom X', price: 52000, topSpeed: 1.12, accel: 1.2, grip: 1.12, toughness: 1.2, color: '#7b2ff7', accent: '#f6e6ff' },
]

// The career ladder — each track is a deterministic procedural layout (seed).
export const TRACKS: TrackSpec[] = [
  { id: 't1', name: 'Coast Run', location: 'Pacific Heights', seed: 1337, length: 900, rivals: 4, difficulty: 0.25, prize: 1500, unlockAt: 0, hilliness: 0.4, curviness: 0.5, traffic: 0.35 },
  { id: 't2', name: 'Canyon Carve', location: 'Red Rock', seed: 4242, length: 1100, rivals: 4, difficulty: 0.4, prize: 2600, unlockAt: 1, hilliness: 0.8, curviness: 0.85, traffic: 0.4 },
  { id: 't3', name: 'Night City', location: 'Downtown', seed: 9001, length: 1200, rivals: 5, difficulty: 0.55, prize: 4200, unlockAt: 2, hilliness: 0.3, curviness: 0.7, traffic: 0.65 },
  { id: 't4', name: 'Pine Pass', location: 'Highlands', seed: 5555, length: 1400, rivals: 5, difficulty: 0.7, prize: 6800, unlockAt: 3, hilliness: 1.0, curviness: 1.0, traffic: 0.5 },
  { id: 't5', name: 'Desert Sprint', location: 'Mojave', seed: 7777, length: 1600, rivals: 5, difficulty: 0.85, prize: 11000, unlockAt: 4, hilliness: 0.5, curviness: 0.6, traffic: 0.55 },
  { id: 't6', name: 'Grand Final', location: 'Summit Ridge', seed: 2025, length: 1900, rivals: 5, difficulty: 1.0, prize: 20000, unlockAt: 5, hilliness: 0.95, curviness: 0.95, traffic: 0.7 },
]

export const getBike = (id: string): BikeSpec => BIKES.find((b) => b.id === id) ?? BIKES[0]
export const getTrack = (id: string): TrackSpec => TRACKS.find((t) => t.id === id) ?? TRACKS[0]
