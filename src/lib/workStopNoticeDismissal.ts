import type { Permit } from '../types/domain'

const STORAGE_KEY = 'nova.dismissedWorkStopResolutionNotices'

export function workStopResolutionDismissKey(permit: Permit): string | null {
  const ws = permit.workStop
  if (!ws?.resolvedAtIso) return null
  if (ws.status !== 'lifted' && ws.status !== 'annulled') return null
  return `${permit.id}::${ws.resolvedAtIso}`
}

function readStore(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, string[]>
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* storage full / private mode */
  }
}

export function loadDismissedWorkStopResolutionKeys(userId: string): Set<string> {
  const store = readStore()
  const list = store[userId]
  return new Set(Array.isArray(list) ? list : [])
}

export function isWorkStopResolutionDismissed(
  userId: string,
  permit: Permit,
): boolean {
  const key = workStopResolutionDismissKey(permit)
  if (!key) return false
  return loadDismissedWorkStopResolutionKeys(userId).has(key)
}

export function dismissWorkStopResolutionNotice(
  userId: string,
  permit: Permit,
): Set<string> {
  const key = workStopResolutionDismissKey(permit)
  if (!key) return loadDismissedWorkStopResolutionKeys(userId)

  const store = readStore()
  const prev = new Set(Array.isArray(store[userId]) ? store[userId]! : [])
  prev.add(key)
  store[userId] = [...prev]
  writeStore(store)
  return prev
}
