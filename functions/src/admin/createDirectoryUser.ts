import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { unmarkDirectoryEmailDeleted } from './deletedDirectoryEmails'

/** Роли, которые админ может заводить из панели (согласованты + работники + смежные). */
export const DIRECTORY_CREATABLE_ROLES = [
  'performer',
  'permitter',
  'issuer',
  'leadExpert',
  'ert',
  'executor',
  'safety',
  'contractor',
] as const

export type DirectoryCreatableRole = (typeof DIRECTORY_CREATABLE_ROLES)[number]

export type CreateDirectoryUserInput = {
  displayName: string
  role: string
  email: string
  password?: string
  /** Должность — дописывается к ФИО как «ФИО — должность». */
  position?: string
  iin?: string
  badgeNo?: string
}

export type CreateDirectoryUserResult = {
  uid: string
  email: string
  displayName: string
  role: DirectoryCreatableRole
  badgeNo: string
  created: boolean
  /** Пароль возвращается только если аккаунт создан или пароль явно задан. */
  temporaryPassword?: string
}

function authErrorCode(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) return String((e as { code: unknown }).code)
  return ''
}

function isCreatableRole(value: string): value is DirectoryCreatableRole {
  return (DIRECTORY_CREATABLE_ROLES as readonly string[]).includes(value)
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function buildDisplayName(fio: string, position?: string): string {
  const name = fio.trim().replace(/\s+/g, ' ')
  const pos = String(position ?? '').trim().replace(/\s+/g, ' ')
  if (!pos) return name
  if (name.includes(' — ')) return name
  return `${name} — ${pos}`
}

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = 'Ns'
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

async function nextBadgeNo(db: Firestore): Promise<string> {
  const snap = await db.collection('users').get()
  let max = 0
  snap.forEach((doc) => {
    const raw = String(doc.data()?.badgeNo ?? '').trim()
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n > max) max = n
  })
  return String(max + 1).padStart(3, '0')
}

export async function createDirectoryUser(
  db: Firestore,
  input: CreateDirectoryUserInput,
): Promise<CreateDirectoryUserResult> {
  const email = normalizeEmail(input.email)
  const roleRaw = String(input.role ?? '').trim()
  const fio = String(input.displayName ?? '').trim()
  const passwordRaw = String(input.password ?? '').trim()
  const iin = String(input.iin ?? '').trim()
  const badgeOverride = String(input.badgeNo ?? '').trim()

  if (!fio || fio.length < 2) {
    throw new HttpsError('invalid-argument', 'Укажите ФИО (не короче 2 символов)')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Укажите корректный email для входа')
  }
  if (!isCreatableRole(roleRaw)) {
    throw new HttpsError(
      'invalid-argument',
      `Роль недоступна. Допустимо: ${DIRECTORY_CREATABLE_ROLES.join(', ')}`,
    )
  }

  const displayName = buildDisplayName(fio, input.position)
  const password = passwordRaw || generatePassword()
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'Пароль не короче 6 символов')
  }

  const auth = getAuth()
  let userRecord
  let created = false
  try {
    userRecord = await auth.getUserByEmail(email)
    await auth.updateUser(userRecord.uid, {
      displayName,
      password,
      emailVerified: true,
    })
  } catch (e: unknown) {
    if (authErrorCode(e) !== 'auth/user-not-found') throw e
    userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    })
    created = true
  }

  const badgeNo = badgeOverride || (await nextBadgeNo(db))

  await db
    .collection('users')
    .doc(userRecord.uid)
    .set(
      {
        displayName,
        role: roleRaw,
        email,
        badgeNo,
        ...(iin ? { iin } : {}),
        updatedAtIso: new Date().toISOString(),
      },
      { merge: true },
    )

  await unmarkDirectoryEmailDeleted(db, email)

  return {
    uid: userRecord.uid,
    email,
    displayName,
    role: roleRaw,
    badgeNo,
    created,
    temporaryPassword: password,
  }
}
