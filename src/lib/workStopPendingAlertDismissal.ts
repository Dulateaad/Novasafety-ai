import type { Permit } from '../types/domain'

const STORAGE_KEY = 'nova.dismissedWorkStopPendingAlerts'

function storageKey(userId: string, permitId: string): string {
  return `${userId}:${permitId}`
}

function readAll(): Record<string, true> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, true>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, true>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadDismissedWorkStopPendingAlertKeys(userId: string): Set<string> {
  const keys = new Set<string>()
  const prefix = `${userId}:`
  for (const key of Object.keys(readAll())) {
    if (key.startsWith(prefix)) keys.add(key.slice(prefix.length))
  }
  return keys
}

export function dismissWorkStopPendingAlert(userId: string, permitId: string): Set<string> {
  const id = permitId.trim()
  if (!id) return loadDismissedWorkStopPendingAlertKeys(userId)
  const all = readAll()
  all[storageKey(userId, id)] = true
  writeAll(all)
  return loadDismissedWorkStopPendingAlertKeys(userId)
}

export function isWorkStopPendingAlertDismissed(
  userId: string,
  permit: Pick<Permit, 'id' | 'workStop'>,
): boolean {
  if (permit.workStop?.status !== 'pending') return false
  return loadDismissedWorkStopPendingAlertKeys(userId).has(permit.id)
}
