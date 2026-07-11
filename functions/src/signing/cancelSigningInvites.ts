import type { Firestore } from 'firebase-admin/firestore'

/** Снять активные приглашения на подпись/ознакомление (аннулирование, закрытие и т.п.). */
export async function cancelActiveSigningInvites(
  db: Firestore,
  permitId: string,
  reason = 'Наряд аннулирован — подпись больше не требуется',
): Promise<number> {
  const pid = permitId.trim()
  if (!pid) return 0
  const snap = await db
    .collection('signingInvites')
    .where('permitId', '==', pid)
    .where('status', '==', 'active')
    .get()
  if (snap.empty) return 0
  const now = new Date().toISOString()
  const batch = db.batch()
  snap.docs.forEach((d) => {
    batch.set(
      d.ref,
      {
        status: 'cancelled',
        message: reason,
        updatedAtIso: now,
        cancelledAtIso: now,
      },
      { merge: true },
    )
  })
  await batch.commit()
  return snap.size
}
