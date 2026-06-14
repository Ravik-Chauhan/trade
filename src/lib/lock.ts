// Hashing for the app-lock secret (PIN digits or pattern node sequence).
// Uses Web Crypto when available (secure contexts incl. the native app) and a
// weak fallback otherwise so the lock still works on plain-http dev pages.
const SALT = 'tickflow-lock:v1:'

function weakHash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return 'w' + (h >>> 0).toString(16)
}

export async function hashSecret(secret: string): Promise<string> {
  const text = SALT + secret
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    /* fall through */
  }
  return weakHash(text)
}
