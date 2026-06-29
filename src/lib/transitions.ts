import type { Permit, PermitStatus, UserRole } from '../types/domain'
import { allCrewAcknowledged } from './crewAckComplete'
import { allRequiredSignaturesComplete } from './signatureStatus'

const EDGES: Record<PermitStatus, PermitStatus[]> = {
  draft: ['on_approval'],
  on_approval: ['issued', 'rejected'],
  rejected: ['draft', 'on_approval', 'annulled'],
  issued: ['in_progress', 'suspended'],
  in_progress: ['suspended', 'closed'],
  suspended: ['in_progress', 'issued', 'closed', 'annulled'],
  closed: ['archived'],
  archived: [],
  annulled: [],
}

export function allowedNextStatuses(from: PermitStatus): PermitStatus[] {
  return EDGES[from] ?? []
}

export function canUserTriggerStatus(
  permit: Permit,
  next: PermitStatus,
  role: UserRole,
): boolean {
  const allowed = allowedNextStatuses(permit.status).includes(next)
  if (!allowed) return false

  if (next === 'on_approval' && permit.status === 'draft') {
    return (
      role === 'performer' ||
      role === 'coordinator' ||
      role === 'contractor' ||
      role === 'issuer'
    )
  }

  if (next === 'issued' && permit.status === 'on_approval') {
    return role === 'issuer' || role === 'coordinator'
  }

  if (next === 'rejected' && permit.status === 'on_approval') {
    return (
      role === 'issuer' ||
      role === 'coordinator' ||
      role === 'permitter' ||
      role === 'performer' ||
      role === 'leadExpert'
    )
  }

  if (next === 'draft' && permit.status === 'rejected') {
    return (
      role === 'performer' ||
      role === 'coordinator' ||
      role === 'contractor' ||
      role === 'issuer' ||
      role === 'safety'
    )
  }

  if (next === 'on_approval' && permit.status === 'rejected') {
    return role === 'safety' || role === 'coordinator'
  }

  if (next === 'in_progress' && permit.status === 'issued') {
    return role === 'performer' || role === 'coordinator'
  }

  if (next === 'suspended' || next === 'closed') {
    return (
      role === 'issuer' ||
      role === 'permitter' ||
      role === 'performer' ||
      role === 'coordinator'
    )
  }

  if (next === 'annulled') {
    return role === 'safety' || role === 'coordinator'
  }

  if (next === 'in_progress' && permit.status === 'suspended') {
    return role === 'safety' || role === 'coordinator'
  }

  if (next === 'issued' && permit.status === 'suspended') {
    return role === 'safety' || role === 'coordinator'
  }

  if (next === 'archived' && permit.status === 'closed') {
    return role === 'coordinator'
  }

  return role === 'coordinator'
}

export interface TransitionBlock {
  ok: false
  reason: string
}

export interface TransitionOk {
  ok: true
}

export type TransitionCheck = TransitionBlock | TransitionOk

/** Клиентская проверка; в промышленной среде дублируется в Cloud Functions. */
export function validateTransition(
  permit: Permit,
  next: PermitStatus,
): TransitionCheck {
  if (!allowedNextStatuses(permit.status).includes(next)) {
    return { ok: false, reason: 'Недопустимый переход статуса' }
  }

  if (next === 'issued') {
    if (!permit.signatures.issuerSigned || !permit.signatures.permitterSigned) {
      return {
        ok: false,
        reason: 'Нельзя выдать НД без обязательных подписей (Выдающий, Допускающий)',
      }
    }
    if (
      permit.category === 1 &&
      !permit.signatures.leadExpertSigned
    ) {
      return {
        ok: false,
        reason: 'Для категории 1 нужна подпись утверждающего НД',
      }
    }
  }

  if (next === 'in_progress' && permit.category === 1) {
    const bad = permit.ndprChecklist.some((i) => i.answer === null)
    if (bad) {
      return {
        ok: false,
        reason:
          'Заполните проверочный лист F09 (НДПР): все пункты Да/Нет/Н/П',
      }
    }
  }

  return { ok: true }
}

/** Автовыдача после завершения всех согласований на этапе on_approval. */
export function issueStatusPatchIfApprovalsComplete(
  permit: Permit,
): Partial<Permit> | null {
  if (permit.status !== 'on_approval') return null
  if (!allCrewAcknowledged(permit)) return null
  if (!allRequiredSignaturesComplete(permit)) return null
  if (permit.isContractorPermit && !permit.contractorSafetyApproved) return null
  return { status: 'issued' }
}
