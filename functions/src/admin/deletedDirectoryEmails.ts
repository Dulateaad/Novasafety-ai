import { FieldValue, type Firestore } from 'firebase-admin/firestore'

const SETTINGS_DOC = 'directory'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function isDirectoryEmailDeleted(
  db: Firestore,
  email: string,
): Promise<boolean> {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  const snap = await db.collection('adminSettings').doc(SETTINGS_DOC).get()
  const list = snap.data()?.deletedEmails
  if (!Array.isArray(list)) return false
  return list.some((item) => normalizeEmail(String(item)) === normalized)
}

export async function markDirectoryEmailDeleted(
  db: Firestore,
  email: string,
): Promise<void> {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  await db
    .collection('adminSettings')
    .doc(SETTINGS_DOC)
    .set(
      {
        deletedEmails: FieldValue.arrayUnion(normalized),
        updatedAtIso: new Date().toISOString(),
      },
      { merge: true },
    )
}

export async function unmarkDirectoryEmailDeleted(
  db: Firestore,
  email: string,
): Promise<void> {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  const ref = db.collection('adminSettings').doc(SETTINGS_DOC)
  const snap = await ref.get()
  const list = snap.data()?.deletedEmails
  if (!Array.isArray(list)) return
  if (!list.some((item) => normalizeEmail(String(item)) === normalized)) return
  await ref.set(
    {
      deletedEmails: FieldValue.arrayRemove(normalized),
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  )
}
