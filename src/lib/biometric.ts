// Thin wrapper around the native biometric plugin. All calls degrade to "not
// available / not authenticated" on web or when no hardware/enrollment exists,
// so callers can use it unconditionally.
import { Capacitor } from '@capacitor/core'

type BioPlugin = {
  checkBiometry: () => Promise<{ isAvailable: boolean }>
  authenticate: (opts: Record<string, unknown>) => Promise<void>
}

let cached: BioPlugin | null | undefined
async function getPlugin(): Promise<BioPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null
  if (cached !== undefined) return cached
  try {
    const mod = await import('@aparajita/capacitor-biometric-auth')
    cached = mod.BiometricAuth as unknown as BioPlugin
  } catch {
    cached = null
  }
  return cached
}

export async function biometricAvailable(): Promise<boolean> {
  const p = await getPlugin()
  if (!p) return false
  try {
    const r = await p.checkBiometry()
    return !!r.isAvailable
  } catch {
    return false
  }
}

export async function biometricAuthenticate(reason = 'Unlock TickFlow'): Promise<boolean> {
  const p = await getPlugin()
  if (!p) return false
  try {
    await p.authenticate({
      reason,
      cancelTitle: 'Use PIN',
      allowDeviceCredential: false,
      androidTitle: 'Unlock TickFlow',
      androidSubtitle: 'Verify your identity',
      androidConfirmationRequired: false,
    })
    return true
  } catch {
    return false
  }
}
