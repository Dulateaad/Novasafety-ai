import type { Permit } from '../types/domain'

const STORAGE_KEY = 'uog.dismissedRejectionNotices'

export function rejectionNoticeDismissKey(permit: Permit): string | null {
  const rejection = permit.lastRejection
  if (!rejection?.atIso) return null
  return `${permit.id}::${rejection.atIso}`
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

export function loadDismissedRejectionKeys(userId: string): Set<string> {
  const store = readStore()
  const list = store[userId]
  return new Set(Array.isArray(list) ? list : [])
}

export function dismissRejectionNotice(userId: string, permit: Permit): Set<string> {
  const key = rejectionNoticeDismissKey(permit)
  if (!key) return loadDismissedRejectionKeys(userId)

  const store = readStore()
  const prev = new Set(Array.isArray(store[userId]) ? store[userId]! : [])
  prev.add(key)
  store[userId] = [...prev]
  writeStore(store)
  return prev
}
