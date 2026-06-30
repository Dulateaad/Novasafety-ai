import type { Permit, PermitStatus, UserRole } from '../types/domain'
import { allCrewAcknowledged } from './crewAckComplete'
import { allRequiredSignaturesComplete, isRoleSigned } from './signatureStatus'
import { localeMessages } from '../i18n/getLocale'

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
  const tr = localeMessages().transitions

  if (!allowedNextStatuses(permit.status).includes(next)) {
    return { ok: false, reason: tr.invalid }
  }

  if (next === 'issued') {
    if (!isRoleSigned(permit, 'performer')) {
      return { ok: false, reason: tr.needPerformer }
    }
    if (!allCrewAcknowledged(permit)) {
      return { ok: false, reason: tr.needCrewAck }
    }
    if (!isRoleSigned(permit, 'issuer') || !isRoleSigned(permit, 'permitter')) {
      return { ok: false, reason: tr.needPermitterIssuer }
    }
    if (permit.category === 1 && !isRoleSigned(permit, 'leadExpert')) {
      return { ok: false, reason: tr.needLeadExpert }
    }
    if (!allRequiredSignaturesComplete(permit)) {
      return { ok: false, reason: tr.needPermitterIssuer }
    }
  }

  if (next === 'in_progress') {
    if (!allCrewAcknowledged(permit)) {
      return { ok: false, reason: tr.needCrewAck }
    }
  }

  if (next === 'in_progress' && permit.category === 1) {
    const bad = permit.ndprChecklist.some((i) => i.answer === null)
    if (bad) {
      return { ok: false, reason: tr.needF09 }
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
