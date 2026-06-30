import type { DocumentData } from 'firebase-admin/firestore'
import { allCrewAcknowledged } from './crewAck'
import { permitRequiresErtApproval } from './fireWorkApproval'
import type { EgovSignRole } from './types'

function isRoleSigned(permit: DocumentData, role: string): boolean {
  const egov = permit.egovSignatures as Record<string, { cmsBase64?: string }> | undefined
  if (egov?.[role]?.cmsBase64?.trim()) return true
  const sig = permit.signatures as Record<string, boolean> | undefined
  if (role === 'performer') return !!sig?.performerSigned
  if (role === 'permitter') return !!sig?.permitterSigned
  if (role === 'issuer') return !!sig?.issuerSigned
  if (role === 'ert') return !!sig?.ertSigned
  return !!sig?.leadExpertSigned
}

const CORE_ORDER: EgovSignRole[] = ['performer', 'issuer', 'permitter', 'leadExpert']

export function signingRoleOrder(permit: DocumentData): EgovSignRole[] {
  if (permitRequiresErtApproval(permit)) {
    return ['performer', 'ert', 'issuer', 'permitter', 'leadExpert']
  }
  return [...CORE_ORDER]
}

export const SIGNING_ROLE_ORDER = CORE_ORDER

export function requiredSignRoles(permit: DocumentData): EgovSignRole[] {
  return signingRoleOrder(permit)
}

function allRequiredSignaturesComplete(permit: DocumentData): boolean {
  return requiredSignRoles(permit).every((role) => isRoleSigned(permit, role))
}

/** Этап подписания: on_approval или наряд ошибочно выдан без всех подписей. */
export function permitSigningPhaseActive(permit: DocumentData): boolean {
  const status = String(permit.status ?? '')
  if (status === 'on_approval') return true
  if (
    (status === 'issued' || status === 'in_progress' || status === 'suspended') &&
    !allRequiredSignaturesComplete(permit)
  ) {
    return true
  }
  return false
}

export function nextRoleToSign(permit: DocumentData): EgovSignRole | null {
  if (!permitSigningPhaseActive(permit)) return null
  if (!isRoleSigned(permit, 'performer')) return 'performer'
  if (!allCrewAcknowledged(permit)) return null
  for (const role of requiredSignRoles(permit)) {
    if (role === 'performer') continue
    if (!isRoleSigned(permit, role)) return role
  }
  return null
}

const SIGNING_ACTION_LABEL: Record<EgovSignRole, string> = {
  performer: 'Заполнение НДПР',
  ert: 'Согласование (ERT)',
  issuer: 'Выдача',
  permitter: 'Допуск',
  leadExpert: 'Утверждение',
}

const SIGNING_ROLE_CAPTION: Record<EgovSignRole, string> = {
  performer: 'Производитель работ',
  permitter: 'Допускающий',
  issuer: 'Выдающий НД',
  leadExpert: 'Утверждающий НД',
  ert: 'ERT Nash (ПАС)',
}

function signerShortName(displayName: string | undefined): string {
  const raw = displayName?.trim()
  if (!raw) return '—'
  const dash = raw.indexOf(' — ')
  if (dash === -1) return raw
  return raw.slice(0, dash).trim() || raw
}

export function signingStepNumber(role: EgovSignRole, permit?: DocumentData): number {
  const order = permit ? signingRoleOrder(permit) : CORE_ORDER
  const i = order.indexOf(role)
  return i >= 0 ? i + 1 : 1
}

/** Подпись шага в очереди согласования (как в UI карточки наряда). */
export function approvalStepLabel(
  role: EgovSignRole,
  displayName?: string,
  permit?: DocumentData,
): string {
  const n = signingStepNumber(role, permit)
  const name = signerShortName(displayName)
  const action = SIGNING_ACTION_LABEL[role]
  return `Шаг ${n}: ${action} — ${name} — ${SIGNING_ROLE_CAPTION[role]}`
}

export function canSignRoleNow(permit: DocumentData, role: EgovSignRole): boolean {
  if (!permitSigningPhaseActive(permit)) return false
  if (isRoleSigned(permit, role)) return false
  if (!requiredSignRoles(permit).includes(role)) return false
  return nextRoleToSign(permit) === role
}

const ROLE_TO_INDEX: Partial<Record<EgovSignRole, number>> = {
  permitter: 0,
  issuer: 1,
  performer: 2,
  leadExpert: 3,
}

export function patchAsorApprovalsOnSign(
  permit: DocumentData,
  role: EgovSignRole,
  input: { fullNamePrinted: string; badgeNo: string; signedAtIso: string },
): Record<string, unknown> | undefined {
  if (role === 'ert') return undefined
  const asor = permit.asor as { approvals?: Record<string, unknown>[] } | undefined
  if (!asor?.approvals || !Array.isArray(asor.approvals)) return undefined
  const idx = ROLE_TO_INDEX[role]
  if (idx === undefined) return undefined
  const approvals = asor.approvals.map((row, i) => {
    if (i !== idx || !row || typeof row !== 'object') return row
    const r = row as Record<string, unknown>
    return {
      ...r,
      fullNamePrinted: input.fullNamePrinted.trim() || String(r.fullNamePrinted ?? ''),
      badgeNo: input.badgeNo.trim() || String(r.badgeNo ?? ''),
      dateIso: input.signedAtIso.slice(0, 10),
      acknowledged: true,
    }
  })
  return { ...asor, approvals }
}
