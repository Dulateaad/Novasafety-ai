import type { DemoUser, Permit, UserRole } from '../types/domain'
import { fillTemplate, localeMessages, roleLabel } from '../i18n/getLocale'
import { isNdGatePassed } from './ndGate'
import { isNavRouteAccessible, navRouteLockedHint } from './navGates'
import { isPprGatePassed } from './pprGate'

const APPROVAL_ROLES = new Set([
  'coordinator',
  'performer',
  'permitter',
  'issuer',
  'leadExpert',
  'ert',
  'safety',
])

export function isUserOnPermitCrew(permit: Permit, userId: string): boolean {
  return permit.executors.some((ex) => ex.userUid.trim() === userId)
}

export function isUserPermitParticipant(permit: Permit, userId: string): boolean {
  const uids = [
    permit.performerUid,
    permit.permitterUid,
    permit.issuerUid,
    permit.leadExpertUid,
    permit.ertUid,
    ...permit.executors.map((ex) => ex.userUid),
  ].map((uid) => uid?.trim()).filter((uid): uid is string => Boolean(uid))
  return uids.includes(userId)
}

export function filterPermitsForUser(
  permits: Permit[],
  user: DemoUser | null,
): Permit[] {
  if (!user) return []
  if (user.role === 'executor') {
    return permits.filter(
      (p) =>
        p.status !== 'draft' &&
        (isUserOnPermitCrew(p, user.id) ||
          !!p.crewAckSignatures?.[user.id]?.cmsBase64?.trim()),
    )
  }
  if (APPROVAL_ROLES.has(user.role)) return permits
  return permits.filter((p) => isUserPermitParticipant(p, user.id))
}

const PACKAGE_AUTHOR_ROLES: readonly UserRole[] = [
  'coordinator',
  'performer',
  'contractor',
  'issuer',
]

export function canUserCreatePermitPackage(user: DemoUser | null): boolean {
  if (!user) return false
  return PACKAGE_AUTHOR_ROLES.includes(user.role)
}

/** Отправка черновика на согласование (draft → on_approval). */
export function canUserSubmitPermitPackage(user: DemoUser | null): boolean {
  if (!user) return false
  return PACKAGE_AUTHOR_ROLES.includes(user.role)
}

export function submitPermitPackageDeniedReason(user: DemoUser | null): string {
  const a = localeMessages().access
  if (!user) return a.loginRequired
  return fillTemplate(a.submitDenied, { role: roleLabel(user.role) })
}

/** Составитель пакета — всегда текущий пользователь с ролью «производитель работ». */
export function resolvePerformerUidForPackage(
  draftPerformerUid: string,
  user: DemoUser | null,
  directory: DemoUser[],
): string {
  const trimmed = draftPerformerUid.trim()
  if (!user || user.role !== 'performer') return trimmed
  const selfInPool = directory.some((u) => u.id === user.id && u.role === 'performer')
  return selfInPool ? user.id : trimmed
}

export function isWorkerOnlyUser(user: DemoUser | null): boolean {
  return user?.role === 'executor'
}

export function isNavRouteAccessibleForUser(to: string, user: DemoUser | null): boolean {
  if (!user) return false
  if (user.role === 'executor') {
    return to === '/' || to.startsWith('/p/')
  }
  if (to === '/' || to === '/matrix' || to === '/ppr') return true
  if (to === '/new' || to === '/certificates') {
    return isPprGatePassed()
  }
  if (to === '/risk-assessment') {
    return isNdGatePassed()
  }
  return true
}

export function navRouteLockedHintForUser(
  to: string,
  user: DemoUser | null,
): string | null {
  if (!user) return 'Войдите в систему.'
  if (user.role === 'executor') {
    if (to === '/') return null
    if (to.startsWith('/p/')) return null
    return 'Работникам доступен только журнал и подписание ознакомления по назначенным нарядам.'
  }
  return isNavRouteAccessible(to) ? null : navRouteLockedHint(to)
}
