import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './nativeNotifications'

export interface ExportResult {
  ok: boolean
  // 'download' (web), 'shared' (native share sheet opened), 'saved' (written but
  // not shared, e.g. share unavailable/cancelled), or 'error'
  mode: 'download' | 'shared' | 'saved' | 'error'
  detail?: string
}

/**
 * Save a backup. On the web this triggers a normal file download; in the Android
 * app a blob <a download> does nothing, so we write the file and open the share
 * sheet (Save to Files / Drive / send to self).
 */
export async function exportBackup(json: string, filename: string): Promise<ExportResult> {
  if (!isNative()) {
    try {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      return { ok: true, mode: 'download' }
    } catch (e) {
      return { ok: false, mode: 'error', detail: e instanceof Error ? e.message : 'download failed' }
    }
  }
  try {
    const res = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
    try {
      await Share.share({ title: 'TickFlow backup', url: res.uri, dialogTitle: 'Save or share your backup' })
      return { ok: true, mode: 'shared' }
    } catch {
      // share dismissed or unavailable — the file is still written to app storage
      return { ok: true, mode: 'saved', detail: res.uri }
    }
  } catch (e) {
    return { ok: false, mode: 'error', detail: e instanceof Error ? e.message : 'could not write file' }
  }
}
