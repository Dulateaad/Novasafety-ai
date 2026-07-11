import type { DemoUser, Permit } from '../types/domain'
import { canUserSubmitPermitPackage } from './permitAccess'
import { isPermitSigningRejected } from './permitRejectionDisplay'

/** Производитель (или автор пакета) может исправить отклонённый наряд и отправить снова. */
export function canUserResubmitRejectedPermit(
  permit: Permit,
  user: DemoUser | null,
): boolean {
  if (!user || !isPermitSigningRejected(permit)) return false
  if (!canUserSubmitPermitPackage(user)) return false
  if (user.role === 'coordinator') return true
  if (user.role === 'contractor' && permit.isContractorPermit) {
    return !permit.performerUid || permit.performerUid === user.id
  }
  // Производитель работ по наряду
  return Boolean(permit.performerUid && permit.performerUid === user.id)
}

/** Сброс ознакомления бригады с АБР — нужен повторный цикл после исправления. */
export function resetExecutorsBriefingAck(
  executors: Permit['executors'],
): Permit['executors'] {
  return executors.map((ex) => ({ ...ex, briefingAcknowledged: false }))
}

/** Патч полей после сброса отклонения (без lastRejection — его чистит репозиторий). */
export function rejectedPermitResubmitFields(
  permit: Pick<Permit, 'executors'>,
): Pick<Permit, 'status' | 'egovSignatures' | 'crewAckSignatures' | 'signatures' | 'executors'> {
  return {
    status: 'draft',
    egovSignatures: {},
    crewAckSignatures: {},
    signatures: {
      performerSigned: false,
      issuerSigned: false,
      permitterSigned: false,
      leadExpertSigned: false,
      ertSigned: false,
    },
    executors: resetExecutorsBriefingAck(permit.executors),
  }
}
