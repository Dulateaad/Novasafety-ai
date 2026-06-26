import type { WorkPermissionsBundle } from '../types/workPermissions'
import { WORK_PERMISSIONS_AUTOSAVE_KEY } from '../types/workPermissions'

export function saveWorkPermissionsToSession(bundle: WorkPermissionsBundle): void {
  try {
    sessionStorage.setItem(WORK_PERMISSIONS_AUTOSAVE_KEY, JSON.stringify(bundle))
  } catch {
    /* ignore */
  }
}

export function restoreWorkPermissionsFromSession(): WorkPermissionsBundle | null {
  try {
    const raw = sessionStorage.getItem(WORK_PERMISSIONS_AUTOSAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WorkPermissionsBundle
  } catch {
    return null
  }
}

export function clearWorkPermissionsSession(): void {
  try {
    sessionStorage.removeItem(WORK_PERMISSIONS_AUTOSAVE_KEY)
  } catch {
    /* ignore */
  }
}
