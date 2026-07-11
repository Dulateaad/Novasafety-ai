import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import {
  buildDisplayName,
  DIRECTORY_CREATABLE_ROLES,
} from './createDirectoryUser'

const DIRECTORY_EDITABLE_ROLES = [...DIRECTORY_CREATABLE_ROLES, 'coordinator'] as const

export type DirectoryEditableRole = (typeof DIRECTORY_EDITABLE_ROLES)[number]

export type UpdateDirectoryUserInput = {
  uid: string
  displayName: string
  role: string
  email: string
  password?: string
  position?: string
  iin?: string
  badgeNo?: string
}

export type UpdateDirectoryUserResult = {
  uid: string
  email: string
  displayName: string
  role: DirectoryEditableRole
  badgeNo: string
  passwordChanged: boolean
  temporaryPassword?: string
}

function isEditableRole(value: string): value is DirectoryEditableRole {
  return (DIRECTORY_EDITABLE_ROLES as readonly string[]).includes(value)
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export async function updateDirectoryUser(
  db: Firestore,
  input: UpdateDirectoryUserInput,
): Promise<UpdateDirectoryUserResult> {
  const uid = String(input.uid ?? '').trim()
  const fio = String(input.displayName ?? '').trim()
  const roleRaw = String(input.role ?? '').trim()
  const email = normalizeEmail(input.email)
  const passwordRaw = String(input.password ?? '').trim()
  const iin = String(input.iin ?? '').trim()
  const badgeOverride = String(input.badgeNo ?? '').trim()

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid обязателен')
  }
  if (!fio || fio.length < 2) {
    throw new HttpsError('invalid-argument', 'Укажите ФИО (не короче 2 символов)')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Укажите корректный email для входа')
  }
  if (!isEditableRole(roleRaw)) {
    throw new HttpsError(
      'invalid-argument',
      `Роль недоступна. Допустимо: ${DIRECTORY_EDITABLE_ROLES.join(', ')}`,
    )
  }
  if (passwordRaw && passwordRaw.length < 6) {
    throw new HttpsError('invalid-argument', 'Пароль не короче 6 символов')
  }

  const profileRef = db.collection('users').doc(uid)
  const profileSnap = await profileRef.get()
  if (!profileSnap.exists) {
    throw new HttpsError('not-found', 'Профиль пользователя не найден')
  }

  const prevRole = String(profileSnap.data()?.role ?? '')
  if (prevRole === 'coordinator' && roleRaw !== 'coordinator') {
    const coordinators = await db.collection('users').where('role', '==', 'coordinator').get()
    if (coordinators.size <= 1) {
      throw new HttpsError(
        'failed-precondition',
        'Нельзя снять роль с последнего координатора',
      )
    }
  }

  const displayName = buildDisplayName(fio, input.position)
  const badgeNo =
    badgeOverride || String(profileSnap.data()?.badgeNo ?? '').trim() || '000'

  const auth = getAuth()
  const authPatch: { displayName: string; email?: string; password?: string } = {
    displayName,
  }
  const currentAuth = await auth.getUser(uid)
  if (email !== normalizeEmail(currentAuth.email ?? '')) {
    authPatch.email = email
  }
  let passwordChanged = false
  if (passwordRaw) {
    authPatch.password = passwordRaw
    passwordChanged = true
  }
  await auth.updateUser(uid, authPatch)

  await profileRef.set(
    {
      displayName,
      role: roleRaw,
      email,
      badgeNo,
      ...(iin ? { iin } : { iin: '' }),
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  )

  return {
    uid,
    email,
    displayName,
    role: roleRaw,
    badgeNo,
    passwordChanged,
    ...(passwordChanged ? { temporaryPassword: passwordRaw } : {}),
  }
}
