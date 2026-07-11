import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { markDirectoryEmailDeleted } from './deletedDirectoryEmails'

export type DeleteDirectoryUserResult = {
  uid: string
  email: string
  deletedAuth: boolean
  deletedProfile: boolean
}

function authErrorCode(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) return String((e as { code: unknown }).code)
  return ''
}

export async function deleteDirectoryUser(
  db: Firestore,
  opts: { targetUid: string; callerUid: string },
): Promise<DeleteDirectoryUserResult> {
  const targetUid = String(opts.targetUid ?? '').trim()
  const callerUid = String(opts.callerUid ?? '').trim()

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'uid обязателен')
  }
  if (targetUid === callerUid) {
    throw new HttpsError('failed-precondition', 'Нельзя удалить собственный аккаунт')
  }

  const targetSnap = await db.collection('users').doc(targetUid).get()
  if (!targetSnap.exists) {
    throw new HttpsError('not-found', 'Профиль пользователя не найден')
  }

  const targetRole = String(targetSnap.data()?.role ?? '')
  const email = String(targetSnap.data()?.email ?? '').trim()

  if (targetRole === 'coordinator') {
    const all = await db.collection('users').where('role', '==', 'coordinator').get()
    if (all.size <= 1) {
      throw new HttpsError(
        'failed-precondition',
        'Нельзя удалить последнего координатора',
      )
    }
  }

  let deletedAuth = false
  try {
    await getAuth().deleteUser(targetUid)
    deletedAuth = true
  } catch (e: unknown) {
    if (authErrorCode(e) !== 'auth/user-not-found') throw e
  }

  await db.collection('users').doc(targetUid).delete()

  if (email) {
    await markDirectoryEmailDeleted(db, email)
  }

  return {
    uid: targetUid,
    email,
    deletedAuth,
    deletedProfile: true,
  }
}
