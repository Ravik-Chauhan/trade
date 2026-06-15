// Central tunables for the pseudo-3D road renderer and game balance.
// The road is rendered with the classic segment-projection technique: the world
// is a list of Z-segments; each is projected to the screen with a pinhole camera.

export const SEG_LENGTH = 200 // world units (z) per road segment
export const RUMBLE_LENGTH = 3 // segments per rumble-strip colour cycle
export const ROAD_WIDTH = 2000 // half-width of the road in world units
export const LANES = 3
export const DRAW_DISTANCE = 220 // segments rendered ahead of the camera
export const FOG_DENSITY = 5
export const FIELD_OF_VIEW = 100 // degrees
export const CAMERA_HEIGHT = 1050 // camera height above the road
export const CENTRIFUGAL = 0.32 // how hard curves push the bike outward

// Speed model. Internal speed unit is world-units/second. We display a fictional
// "mph" scaled for readability.
export const MAX_SPEED = SEG_LENGTH * 62 // top speed (world units / s)
export const ACCEL = MAX_SPEED / 4.5 // base acceleration
export const BRAKING = -MAX_SPEED / 2.4
export const DECEL = -MAX_SPEED / 5.5 // natural coast deceleration
export const OFF_ROAD_DECEL = -MAX_SPEED / 1.6
export const OFF_ROAD_LIMIT = MAX_SPEED / 3.2
export const MPH_PER_UNIT = 0.0145 // display only

// Palette — a dusk highway look, fully procedural, no external assets.
export const COLORS = {
  sky: '#1a2a6c',
  skyLow: '#b21f66',
  haze: '#f6b87c',
  fog: '#2a2350',
  treeDark: '#0e3b2e',
  treeLight: '#155e43',
  light: {
    road: '#6b6b6b',
    grass: '#1f7a3a',
    rumble: '#cfd2d6',
    lane: '#e9e9e9',
  },
  dark: {
    road: '#656565',
    grass: '#1c6f35',
    rumble: '#b81d3a',
    lane: '#656565',
  },
  start: { road: '#ffffff', grass: '#1f7a3a', rumble: '#ffffff', lane: '#ffffff' },
  finish: { road: '#222', grass: '#1f7a3a', rumble: '#222', lane: '#222' },
} as const

export type RoadColors = { road: string; grass: string; rumble: string; lane: string }

export const HUD_FONT = "700 16px 'Trebuchet MS', system-ui, sans-serif"
export const TITLE_FONT = "800 italic 64px 'Trebuchet MS', system-ui, sans-serif"
