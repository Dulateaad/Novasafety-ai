import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { Permit } from '../types/domain'
import type { WorkStopAlert, WorkStopState } from '../types/workStop'

function alertId(permitId: string, assigneeUid: string): string {
  return `${permitId}_${assigneeUid}`
}

export async function createWorkStopAlerts(
  fs: Firestore,
  permit: Permit,
  workStop: WorkStopState,
  assigneeUids: string[],
): Promise<void> {
  const col = collection(fs, 'workStopAlerts')
  for (const assigneeUid of assigneeUids) {
    const id = alertId(permit.id, assigneeUid)
    await setDoc(doc(col, id), {
      id,
      permitId: permit.id,
      permitTitle: permit.title,
      siteName: permit.siteName,
      assigneeUid,
      status: 'pending',
      reason: workStop.reason,
      initiatedByUid: workStop.initiatedByUid,
      initiatedByName: workStop.initiatedByName,
      atIso: workStop.atIso,
    })
  }
}

export async function resolveWorkStopAlertsFs(
  fs: Firestore,
  permitId: string,
): Promise<void> {
  const col = collection(fs, 'workStopAlerts')
  const snap = await getDocs(query(col, where('permitId', '==', permitId)))
  const resolvedAtIso = new Date().toISOString()
  await Promise.all(
    snap.docs.map((d) =>
      setDoc(d.ref, { status: 'resolved', resolvedAtIso }, { merge: true }),
    ),
  )
}

export function buildWorkStopAlertRecords(
  permit: Permit,
  workStop: WorkStopState,
  assigneeUids: string[],
): WorkStopAlert[] {
  return assigneeUids.map((assigneeUid) => ({
    id: alertId(permit.id, assigneeUid),
    permitId: permit.id,
    permitTitle: permit.title,
    siteName: permit.siteName,
    assigneeUid,
    status: 'pending' as const,
    reason: workStop.reason,
    initiatedByUid: workStop.initiatedByUid,
    initiatedByName: workStop.initiatedByName,
    atIso: workStop.atIso,
  }))
}
