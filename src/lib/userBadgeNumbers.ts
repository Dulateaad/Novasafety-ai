import type { DemoUser } from '../types/domain'
import { formatRegistrationNumber } from './registrationNumber'

/** Стабильный порядок для автонумерации (как в справочнике Firebase). */
export function sortedDirectoryForBadges(directory: DemoUser[]): DemoUser[] {
  return [...directory].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName, 'ru') || a.id.localeCompare(b.id),
  )
}

export function buildUserBadgeMap(directory: DemoUser[]): Map<string, string> {
  const map = new Map<string, string>()
  sortedDirectoryForBadges(directory).forEach((u, i) => {
    map.set(u.id, u.badgeNo?.trim() || formatRegistrationNumber(i + 1))
  })
  return map
}

/** № пропуска учётной записи: из профиля или 001, 002, … по справочнику. */
export function resolveUserBadgeNo(
  userId: string | undefined,
  directory: DemoUser[],
): string {
  const uid = userId?.trim()
  if (!uid) return ''
  const user = directory.find((u) => u.id === uid)
  if (user?.badgeNo?.trim()) return user.badgeNo.trim()
  return buildUserBadgeMap(directory).get(uid) ?? ''
}
