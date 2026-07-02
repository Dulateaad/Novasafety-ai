import type { DemoUser, Permit, UserRole } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { ROLE_LABELS } from '../types/domain'
import {
  approvalStepLabel,
  canSignRoleNow,
  displayRoleSigned,
  nextRoleToSign,
  permitSigningPhaseActive,
  signingQueueBlockedReason,
} from './approvalSequence'
import {
  actorMatchesAssigneeForRole,
  resolvedAssigneeUidForRole,
} from './signatureStatus'

export type SignEligibility = {
  canSign: boolean
  reason: string | null
}

const EGOV_ROLE_TO_USER_ROLE: Partial<Record<EgovSignRole, UserRole>> = {
  performer: 'performer',
  permitter: 'permitter',
  issuer: 'issuer',
  leadExpert: 'leadExpert',
  ert: 'ert',
}

export function signEligibilityForRole(
  permit: Permit,
  user: DemoUser,
  role: EgovSignRole,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): SignEligibility {
  if (!permitSigningPhaseActive(permit)) {
    return { canSign: false, reason: 'Наряд не на этапе «На согласовании».' }
  }

  if (displayRoleSigned(permit, role, directory)) {
    return { canSign: false, reason: 'Этот этап уже подписан.' }
  }

  const next = nextRoleToSign(permit, directory)
  if (next !== role) {
    return {
      canSign: false,
      reason: next
        ? `Сейчас очередь: ${approvalStepLabel(next, permit, resolveUser)}.`
        : signingQueueBlockedReason(permit, directory) ??
          'Все обязательные этапы подписаны.',
    }
  }

  if (!canSignRoleNow(permit, role, directory)) {
    return { canSign: false, reason: 'Подпись этого этапа пока недоступна.' }
  }

  if (user.role === 'coordinator') {
    return { canSign: true, reason: null }
  }

  if (EGOV_ROLE_TO_USER_ROLE[role] === user.role) {
    return { canSign: true, reason: null }
  }

  if (actorMatchesAssigneeForRole(permit, role, user, directory)) {
    return { canSign: true, reason: null }
  }

  const assigneeUid = resolvedAssigneeUidForRole(permit, role, directory)
  const assignee = resolveUser(assigneeUid)
  return {
    canSign: false,
    reason: `В наряде указан другой ${ROLE_LABELS[role].toLowerCase()}: ${assignee?.displayName ?? assigneeUid}. Вы: ${user.displayName}.`,
  }
}
