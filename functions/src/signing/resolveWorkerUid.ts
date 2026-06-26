import { getAuth } from 'firebase-admin/auth'
import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import { WORKER_ACCOUNT_TEMPLATES } from './workerTemplates'

function demoWorkerEmail(uid: string): string | null {
  const match = /^w-worker-(\d+)$/.exec(uid)
  if (!match) return null
  const idx = Number(match[1]) - 1
  return WORKER_ACCOUNT_TEMPLATES[idx]?.email ?? null
}

/** w-worker-N → Firebase UID по email шаблона. */
export async function resolveWorkerUidOnServer(
  db: Firestore,
  draftUid: string,
): Promise<string> {
  const uid = draftUid.trim()
  if (!uid) return ''

  const direct = await db.collection('users').doc(uid).get()
  if (direct.exists) return uid

  const email = demoWorkerEmail(uid)
  if (!email) return uid

  try {
    const authUser = await getAuth().getUserByEmail(email)
    const snap = await db.collection('users').doc(authUser.uid).get()
    if (snap.exists) return authUser.uid
    return authUser.uid
  } catch {
    return uid
  }
}

export async function normalizePermitExecutorUids(
  db: Firestore,
  permit: DocumentData,
): Promise<{ executors: DocumentData[]; changed: boolean }> {
  const executors = Array.isArray(permit.executors) ? [...permit.executors] : []
  let changed = false
  const next = await Promise.all(
    executors.map(async (ex) => {
      const raw = String((ex as { userUid?: string }).userUid ?? '').trim()
      if (!raw) return ex
      const resolved = await resolveWorkerUidOnServer(db, raw)
      if (resolved && resolved !== raw) {
        changed = true
        return { ...ex, userUid: resolved }
      }
      return ex
    }),
  )
  return { executors: next, changed }
}
