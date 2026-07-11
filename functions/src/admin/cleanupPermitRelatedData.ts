import type { Firestore } from 'firebase-admin/firestore'

export type PermitRelatedCleanupCounts = {
  signingInvites: number
  permitNotices: number
  workStopAlerts: number
}

async function deleteByPermitId(
  db: Firestore,
  collectionName: string,
  permitId: string,
): Promise<number> {
  const pid = permitId.trim()
  if (!pid) return 0
  const snap = await db.collection(collectionName).where('permitId', '==', pid).get()
  if (snap.empty) return 0
  const batch = db.batch()
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return snap.size
}

/** Удалить все данные ролей/уведомлений, привязанные к наряду. */
export async function deletePermitRelatedDataAdmin(
  db: Firestore,
  permitId: string,
): Promise<PermitRelatedCleanupCounts> {
  const [signingInvites, permitNotices, workStopAlerts] = await Promise.all([
    deleteByPermitId(db, 'signingInvites', permitId),
    deleteByPermitId(db, 'permitNotices', permitId),
    deleteByPermitId(db, 'workStopAlerts', permitId),
  ])
  return { signingInvites, permitNotices, workStopAlerts }
}

export async function deletePermitRelatedDataForPermitsAdmin(
  db: Firestore,
  permitIds: string[],
): Promise<PermitRelatedCleanupCounts> {
  const totals: PermitRelatedCleanupCounts = {
    signingInvites: 0,
    permitNotices: 0,
    workStopAlerts: 0,
  }
  for (const permitId of permitIds) {
    const counts = await deletePermitRelatedDataAdmin(db, permitId)
    totals.signingInvites += counts.signingInvites
    totals.permitNotices += counts.permitNotices
    totals.workStopAlerts += counts.workStopAlerts
  }
  return totals
}

/** Удалить уведомления и задания для уже удалённых нарядов. */
export async function cleanupOrphanPermitRelatedData(
  db: Firestore,
): Promise<
  PermitRelatedCleanupCounts & {
    scannedSigningInvites: number
    scannedPermitNotices: number
    scannedWorkStopAlerts: number
  }
> {
  const [permitsSnap, invitesSnap, noticesSnap, alertsSnap] = await Promise.all([
    db.collection('permits').get(),
    db.collection('signingInvites').get(),
    db.collection('permitNotices').get(),
    db.collection('workStopAlerts').get(),
  ])
  const liveIds = new Set(permitsSnap.docs.map((d) => d.id))
  const totals: PermitRelatedCleanupCounts = {
    signingInvites: 0,
    permitNotices: 0,
    workStopAlerts: 0,
  }

  for (const inviteDoc of invitesSnap.docs) {
    const permitId = String(inviteDoc.data().permitId ?? '').trim()
    if (!permitId || liveIds.has(permitId)) continue
    await inviteDoc.ref.delete()
    totals.signingInvites += 1
  }

  for (const noticeDoc of noticesSnap.docs) {
    const permitId = String(noticeDoc.data().permitId ?? '').trim()
    if (!permitId || liveIds.has(permitId)) continue
    await noticeDoc.ref.delete()
    totals.permitNotices += 1
  }

  for (const alertDoc of alertsSnap.docs) {
    const permitId = String(alertDoc.data().permitId ?? '').trim()
    if (!permitId || liveIds.has(permitId)) continue
    await alertDoc.ref.delete()
    totals.workStopAlerts += 1
  }

  return {
    ...totals,
    scannedSigningInvites: invitesSnap.size,
    scannedPermitNotices: noticesSnap.size,
    scannedWorkStopAlerts: alertsSnap.size,
  }
}
