import type { Permit } from '../types/domain'
import { loadUserDismissals, persistUserDismissal } from './userDismissals'

const KIND = 'workStopResolution'

export function workStopResolutionDismissKey(permit: Permit): string | null {
  const ws = permit.workStop
  if (!ws?.resolvedAtIso) return null
  if (ws.status !== 'lifted' && ws.status !== 'annulled') return null
  return `${permit.id}::${ws.resolvedAtIso}`
}

export async function loadDismissedWorkStopResolutionKeys(
  userId: string,
): Promise<Set<string>> {
  const all = await loadUserDismissals(userId)
  const keys = new Set<string>()
  for (const k of all) {
    if (k.startsWith(`${KIND}:`)) keys.add(k.slice(KIND.length + 1))
  }
  try {
    const raw = localStorage.getItem('nova.dismissedWorkStopResolutionNotices')
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

export async function isWorkStopResolutionDismissed(
  userId: string,
  permit: Permit,
): Promise<boolean> {
  const key = workStopResolutionDismissKey(permit)
  if (!key) return false
  const keys = await loadDismissedWorkStopResolutionKeys(userId)
  return keys.has(key)
}

export async function dismissWorkStopResolutionNotice(
  userId: string,
  permit: Permit,
): Promise<Set<string>> {
  const key = workStopResolutionDismissKey(permit)
  if (!key) return loadDismissedWorkStopResolutionKeys(userId)
  await persistUserDismissal(userId, KIND, key)
  return loadDismissedWorkStopResolutionKeys(userId)
}
