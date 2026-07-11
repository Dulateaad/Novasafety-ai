import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'

export type PermitRelatedCleanupCounts = {
  signingInvites: number
  permitNotices: number
  workStopAlerts: number
}

export type CleanupOrphanPermitDataResult = PermitRelatedCleanupCounts & {
  scannedSigningInvites: number
  scannedPermitNotices: number
  scannedWorkStopAlerts: number
}

export async function cleanupPermitRelatedDataClient(
  permitIds: string[],
): Promise<PermitRelatedCleanupCounts | null> {
  if (!firebaseConfigured || !app || permitIds.length === 0) return null
  const fn = httpsCallable<{ permitIds: string[] }, PermitRelatedCleanupCounts>(
    getFunctions(app, REGION),
    'cleanupPermitRelatedDataFn',
  )
  const res = await fn({ permitIds })
  return res.data
}

export async function cleanupOrphanPermitRelatedDataClient(): Promise<CleanupOrphanPermitDataResult | null> {
  if (!firebaseConfigured || !app) return null
  const fn = httpsCallable<Record<string, never>, CleanupOrphanPermitDataResult>(
    getFunctions(app, REGION),
    'cleanupOrphanPermitRelatedDataFn',
  )
  const res = await fn({})
  return res.data
}

/** Скрыть задания/уведомления, если наряд уже удалён из журнала. */
export function filterByExistingPermits<T extends { permitId: string }>(
  items: readonly T[],
  existingPermitIds: ReadonlySet<string>,
): T[] {
  return items.filter((item) => existingPermitIds.has(item.permitId))
}
