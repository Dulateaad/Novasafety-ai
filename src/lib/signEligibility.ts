import type { DemoUser, Permit } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { ROLE_LABELS } from '../types/domain'
import { approvalStepLabel, canSignRoleNow, nextRoleToSign } from './approvalSequence'
import { uidMatchesAccount } from './permitAccess'
import { assigneeUidForRole, isRoleSigned } from './signatureStatus'

export type SignEligibility = {
  canSign: boolean
  reason: string | null
}

export function signEligibilityForRole(
  permit: Permit,
  user: DemoUser,
  role: EgovSignRole,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): SignEligibility {
  if (permit.status !== 'on_approval') {
    return { canSign: false, reason: 'Наряд не на этапе «На согласовании».' }
  }

  if (isRoleSigned(permit, role)) {
    return { canSign: false, reason: 'Этот этап уже подписан.' }
  }

  const next = nextRoleToSign(permit)
  if (next !== role) {
    return {
      canSign: false,
      reason: next
        ? `Сейчас очередь: ${approvalStepLabel(next)}.`
        : 'Все обязательные этапы подписаны.',
    }
  }

  if (!canSignRoleNow(permit, role)) {
    return { canSign: false, reason: 'Подпись этого этапа пока недоступна.' }
  }

  /** Координатор подписывает текущий этап очереди (если functions/назначенный недоступны). */
  if (user.role === 'coordinator') {
    return {
      canSign: true,
      reason: null,
    }
  }

  const assigneeUid = assigneeUidForRole(permit, role)
  const assignee = resolveUser(assigneeUid)

  if (user.role !== role) {
    return {
      canSign: false,
      reason: `Подпись ставит ${ROLE_LABELS[role]} (${assignee?.displayName ?? assigneeUid}). Вы вошли как ${ROLE_LABELS[user.role]}.`,
    }
  }

  if (!uidMatchesAccount(assigneeUid, user, directory)) {
    return {
      canSign: false,
      reason: `В наряде указан другой ${ROLE_LABELS[role].toLowerCase()}: ${assignee?.displayName ?? assigneeUid}. Вы: ${user.displayName}.`,
    }
  }

  return { canSign: true, reason: null }
}
