import type { DemoUser, UserRole } from '../types/domain'

const VALID_ROLES: readonly UserRole[] = [
  'issuer',
  'permitter',
  'performer',
  'executor',
  'coordinator',
  'contractor',
  'safety',
  'leadExpert',
] as const

export function normalizeUserRole(value: unknown): UserRole {
  if (
    typeof value === 'string' &&
    (VALID_ROLES as readonly string[]).includes(value)
  ) {
    return value as UserRole
  }
  return 'coordinator'
}

/** Документ Firestore `users/{uid}` — заводится администратором вручную. */
export interface UserProfileDocument {
  displayName: string
  role: UserRole | string
  email?: string
}

export function profileDocToDemoUser(
  uid: string,
  data: Record<string, unknown>,
  fallbackEmail: string,
): DemoUser {
  const displayName =
    typeof data.displayName === 'string' && data.displayName.trim()
      ? data.displayName.trim()
      : 'Пользователь'
  const email =
    typeof data.email === 'string' && data.email.trim()
      ? data.email.trim(
      )
      : fallbackEmail
  return {
    id: uid,
    displayName,
    email,
    role: normalizeUserRole(data.role),
  }
}

export async function loadAllUserProfiles(
  getDocs: () => Promise<{ forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) => void }>,
): Promise<DemoUser[]> {
  const snap = await getDocs()
  const list: DemoUser[] = []
  snap.forEach((d) => {
    list.push(
      profileDocToDemoUser(d.id, d.data(), String(d.data().email ?? '')),
    )
  })
  return list.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'ru'),
  )
}
