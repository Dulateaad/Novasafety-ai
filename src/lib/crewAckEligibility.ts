import type { Permit, PermitStatus, UserRole, DemoUser } from '../types/domain'
import { localeMessages } from '../i18n/getLocale'
import { isExecutorCrewAckDone } from './crewAckComplete'
import { isUserOnPermitCrew, uidMatchesAccount } from './permitAccess'
import { resolveWorkerUid } from './resolveWorkerUid'
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

export function crewAckBlockedReason(
  permit: Permit,
  directory: DemoUser[] = [],
): string | null {
  const c = localeMessages().crew
  if (!isCrewAckPeriodActive(permit.status)) {
    return c.notOnApproval
  }
  if (!isRoleSigned(permit, 'performer', directory)) {
    return c.needProducer
  }
  return null
}

function executorRowForUser(
  permit: Permit,
  userId: string,
  user: DemoUser | undefined,
  directory: DemoUser[],
) {
  return permit.executors.find((ex) => {
    const raw = ex.userUid.trim()
    if (!raw) return false
    if (raw === userId) return true
    if (resolveWorkerUid(directory, raw) === userId) return true
    return user ? uidMatchesAccount(raw, user, directory) : false
  })
}

export function canUserSignCrewAck(
  permit: Permit,
  userId: string,
  role: UserRole,
  user?: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  if (crewAckBlockedReason(permit, directory)) return false
  if (!isUserOnPermitCrew(permit, userId, user, directory)) return false
  if (isExecutorCrewAckDone(permit, userId, directory)) return false
  if (user && isExecutorCrewAckDone(permit, user.id, directory)) return false
  const row = executorRowForUser(permit, userId, user, directory)
  if (row?.briefingAcknowledged) return false
  return role === 'executor' || role === 'coordinator'
}
