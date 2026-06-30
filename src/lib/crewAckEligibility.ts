import type { Permit, PermitStatus, UserRole, DemoUser } from '../types/domain'
import { localeMessages } from '../i18n/getLocale'
import { isUserOnPermitCrew, uidMatchesAccount } from './permitAccess'
import { isRoleSigned } from './signatureStatus'

/** Ознакомление бригады доступно до начала работ (после выдачи наряда тоже). */
const CREW_ACK_ACTIVE_STATUSES: ReadonlySet<PermitStatus> = new Set([
  'on_approval',
  'issued',
  'in_progress',
])

export function isCrewAckPeriodActive(status: PermitStatus): boolean {
  return CREW_ACK_ACTIVE_STATUSES.has(status)
}

export function crewAckBlockedReason(permit: Permit): string | null {
  const c = localeMessages().crew
  if (!isCrewAckPeriodActive(permit.status)) {
    return c.notOnApproval
  }
  if (!isRoleSigned(permit, 'performer')) {
    return c.needProducer
  }
  return null
}

export function canUserSignCrewAck(
  permit: Permit,
  userId: string,
  role: UserRole,
  user?: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  if (crewAckBlockedReason(permit)) return false
  if (!isUserOnPermitCrew(permit, userId, user, directory)) return false
  if (user && permit.crewAckSignatures?.[user.id]?.cmsBase64?.trim()) return false
  if (permit.crewAckSignatures?.[userId]?.cmsBase64?.trim()) return false
  const row = permit.executors.find(
    (ex) =>
      ex.userUid === userId ||
      (user ? uidMatchesAccount(ex.userUid, user, directory) : false),
  )
  if (row?.briefingAcknowledged) return false
  return role === 'executor' || role === 'coordinator'
}
