import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

/** Удалить все signingInvites, привязанные к наряду. */
export async function deleteSigningInvitesForPermit(
  db: Firestore,
  permitId: string,
): Promise<number> {
  const pid = permitId.trim()
  if (!pid) return 0
  const snap = await getDocs(
    query(collection(db, 'signingInvites'), where('permitId', '==', pid)),
  )
  if (snap.empty) return 0
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return snap.size
}

/** Удалить приглашения для нескольких нарядов. */
export async function deleteSigningInvitesForPermits(
  db: Firestore,
  permitIds: string[],
): Promise<number> {
  let total = 0
  for (const id of permitIds) {
    total += await deleteSigningInvitesForPermit(db, id)
  }
  return total
}
