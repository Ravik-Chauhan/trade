import { registerPlugin } from '@capacitor/core'
import { isNative } from './nativeNotifications'

// Bridges the custom Android BatteryOptimizationPlugin (see MainActivity).
interface BatteryOptimizationPlugin {
  isIgnoring(): Promise<{ ignoring: boolean }>
  openSettings(): Promise<void>
  openAppSettings(): Promise<void>
}

const BatteryOptimization = registerPlugin<BatteryOptimizationPlugin>('BatteryOptimization')

/** true = exempt (good), false = optimized (may delay reminders), null = unknown/web. */
export async function isIgnoringBatteryOptimizations(): Promise<boolean | null> {
  if (!isNative()) return null
  try {
    const res = await BatteryOptimization.isIgnoring()
    return !!res.ignoring
  } catch {
    return null
  }
}

/** Opens the system battery-optimization screen so the user can exempt the app. */
export async function openBatterySettings(): Promise<void> {
  if (!isNative()) return
  try {
    await BatteryOptimization.openSettings()
  } catch {
    /* ignore */
  }
}

/** Opens this app's system details page (for manually toggling notifications). */
export async function openAppSettings(): Promise<void> {
  if (!isNative()) return
  try {
    await BatteryOptimization.openAppSettings()
  } catch {
    /* ignore */
  }
}
