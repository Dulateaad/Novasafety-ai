import type { Firestore } from 'firebase-admin/firestore'

/** Удалить приглашения на подпись для удалённых нарядов. */
export async function cleanupOrphanSigningInvites(
  db: Firestore,
): Promise<{ deleted: number; scanned: number }> {
  const [permitsSnap, invitesSnap] = await Promise.all([
    db.collection('permits').get(),
    db.collection('signingInvites').get(),
  ])
  const liveIds = new Set(permitsSnap.docs.map((d) => d.id))
  let deleted = 0
  for (const inviteDoc of invitesSnap.docs) {
    const permitId = String(inviteDoc.data().permitId ?? '').trim()
    if (!permitId || liveIds.has(permitId)) continue
    await inviteDoc.ref.delete()
    deleted += 1
  }
  return { deleted, scanned: invitesSnap.size }
}

export async function deleteSigningInvitesForPermitAdmin(
  db: Firestore,
  permitId: string,
): Promise<number> {
  const pid = permitId.trim()
  if (!pid) return 0
  const snap = await db
    .collection('signingInvites')
    .where('permitId', '==', pid)
    .get()
  if (snap.empty) return 0
  const batch = db.batch()
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return snap.size
}
