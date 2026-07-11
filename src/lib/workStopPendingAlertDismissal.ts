import type { Permit } from '../types/domain'
import { loadUserDismissals, persistUserDismissal } from './userDismissals'

const KIND = 'workStopPending'

export async function loadDismissedWorkStopPendingAlertKeys(
  userId: string,
): Promise<Set<string>> {
  const all = await loadUserDismissals(userId)
  const keys = new Set<string>()
  for (const k of all) {
    if (k.startsWith(`${KIND}:`)) keys.add(k.slice(KIND.length + 1))
  }
  try {
    const raw = localStorage.getItem('nova.dismissedWorkStopPendingAlerts')
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, true>
      const prefix = `${userId}:`
      for (const key of Object.keys(parsed ?? {})) {
        if (key.startsWith(prefix)) keys.add(key.slice(prefix.length))
      }
    }
  } catch {
    /* ignore */
  }
  return keys
}

export async function dismissWorkStopPendingAlert(
  userId: string,
  permitId: string,
): Promise<Set<string>> {
  const id = permitId.trim()
  if (!id) return loadDismissedWorkStopPendingAlertKeys(userId)
  await persistUserDismissal(userId, KIND, id)
  return loadDismissedWorkStopPendingAlertKeys(userId)
}

export async function isWorkStopPendingAlertDismissed(
  userId: string,
  permit: Pick<Permit, 'id' | 'workStop'>,
): Promise<boolean> {
  if (permit.workStop?.status !== 'pending') return false
  const keys = await loadDismissedWorkStopPendingAlertKeys(userId)
  return keys.has(permit.id)
}
