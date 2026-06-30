import type { Permit } from '../types/domain'
import type { EgovSignRole, EgovSignaturesMap } from '../types/egovSignature'
import { approvalIndexForRole, requiredSignRoles } from './approvalSequence'

export function getEgovSignatures(permit: Permit): EgovSignaturesMap {
  return permit.egovSignatures ?? {}
}

export function hasEgovRoleSignature(permit: Permit, role: EgovSignRole): boolean {
  const s = getEgovSignatures(permit)[role]
  return !!s?.cmsBase64?.trim()
}

/** Эффективный статус подписи: ЭЦП или legacy-галочка. */
export function isRoleSigned(permit: Permit, role: EgovSignRole): boolean {
  if (hasEgovRoleSignature(permit, role)) return true
  if (role === 'performer') return !!permit.signatures.performerSigned
  if (role === 'permitter') return permit.signatures.permitterSigned
  if (role === 'issuer') return permit.signatures.issuerSigned
  if (role === 'ert') return !!permit.signatures.ertSigned
  return permit.signatures.leadExpertSigned
}

export function allRequiredSignaturesComplete(permit: Permit): boolean {
  return requiredSignRoles(permit).every((role) => isRoleSigned(permit, role))
}

export function assigneeUidForRole(permit: Permit, role: EgovSignRole): string {
  if (role === 'performer') return permit.performerUid
  if (role === 'permitter') return permit.permitterUid
  if (role === 'issuer') return permit.issuerUid
  if (role === 'ert') return permit.ertUid?.trim() || 'u-ert'
  return permit.leadExpertUid
}

/** ФИО подписанта для карточки наряда (ЭЦП → назначенный → ASOR). */
export function roleSignedByLabel(
  permit: Permit,
  role: EgovSignRole,
  resolveUser?: (uid: string) => { displayName?: string } | undefined,
): string | null {
  const egovName = permit.egovSignatures?.[role]?.signedByDisplayName?.trim()
  if (egovName) return egovName

  const assigneeName = resolveUser?.(assigneeUidForRole(permit, role))?.displayName?.trim()
  if (assigneeName) return assigneeName

  const idx = approvalIndexForRole(role)
  const asorName = idx >= 0 ? permit.asor?.approvals?.[idx]?.fullNamePrinted?.trim() : ''
  return asorName || null
}
