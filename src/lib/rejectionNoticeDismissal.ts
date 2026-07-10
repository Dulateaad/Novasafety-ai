import type { Permit } from '../types/domain'
import {
  loadUserDismissals,
  persistUserDismissal,
} from './userDismissals'

const KIND = 'rejection'

export function rejectionNoticeDismissKey(permit: Permit): string | null {
  const rejection = permit.lastRejection
  if (!rejection?.atIso) return null
  return `${permit.id}::${rejection.atIso}`
}

export async function loadDismissedRejectionKeys(userId: string): Promise<Set<string>> {
  const all = await loadUserDismissals(userId)
  const keys = new Set<string>()
  for (const k of all) {
    if (k.startsWith(`${KIND}:`)) keys.add(k.slice(KIND.length + 1))
  }
  // legacy
  try {
    const raw = localStorage.getItem('uog.dismissedRejectionNotices')
    if (raw) {
      const store = JSON.parse(raw) as Record<string, string[]>
      const list = store[userId]
      if (Array.isArray(list)) list.forEach((x) => keys.add(x))
    }
  } catch {
    /* ignore */
  }
  return keys
}

export async function dismissRejectionNotice(
  userId: string,
  permit: Permit,
): Promise<Set<string>> {
  const key = rejectionNoticeDismissKey(permit)
  if (!key) return loadDismissedRejectionKeys(userId)
  await persistUserDismissal(userId, KIND, key)
  return loadDismissedRejectionKeys(userId)
}
