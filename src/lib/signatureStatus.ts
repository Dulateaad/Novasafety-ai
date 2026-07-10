import {
  enrichUserDirectoryWithDefaultSigners,
  resolveErtSignerUid,
  resolveNdprSignerUid,
} from '../config/defaultNdprSigners'
import type { DemoUser, Permit } from '../types/domain'
import type { EgovSignRole, EgovSignaturesMap, StoredEgovSignature } from '../types/egovSignature'
import { approvalIndexForRole, requiredSignRoles } from './approvalSequence'
import { uidMatchesAccount } from './permitAccess'
import { isPermitSigningRejected } from './permitRejectionDisplay'

export function getEgovSignatures(permit: Permit): EgovSignaturesMap {
  return permit.egovSignatures ?? {}
}

/** На согласовании — только CMS; вне этапа — любая запись (для PDF/архива). */
export function hasEgovRoleSignature(
  permit: Permit,
  role: EgovSignRole,
  opts?: { strictAssignee?: boolean; directory?: DemoUser[] },
): boolean {
  const sig = getEgovSignatures(permit)[role]
  if (!sig?.cmsBase64?.trim()) return false
  if (!opts?.strictAssignee) return true
  return egovSignatureMatchesAssignee(permit, role, sig, opts.directory ?? [])
}

function signingDirectory(directory: DemoUser[]): DemoUser[] {
  return enrichUserDirectoryWithDefaultSigners(directory)
}

function strictEgovSigningPhase(permit: Permit): boolean {
  return permit.status === 'on_approval' || isPermitSigningRejected(permit)
}

export function isStrictEgovSigningPhase(permit: Permit): boolean {
  return strictEgovSigningPhase(permit)
}

function egovSignatureMatchesAssignee(
  permit: Permit,
  role: EgovSignRole,
  sig: StoredEgovSignature,
  directory: DemoUser[],
): boolean {
  const dir = signingDirectory(directory)
  const assigneeUid = resolvedAssigneeUidForRole(permit, role, dir).trim()
  const signerUid = String(sig.signedByUid ?? '').trim()
  const strict = strictEgovSigningPhase(permit)

  if (strict) {
    if (!assigneeUid || !signerUid) return false
  } else if (!assigneeUid || !signerUid) {
    return true
  }

  const signer =
    dir.find((u) => u.id === signerUid) ??
    ({ id: signerUid, email: '', displayName: '', role } as DemoUser)
  return uidMatchesAccount(assigneeUid, signer, dir)
}

/** Действующая ЭЦП текущего назначенного участника. */
export function validEgovRoleSignature(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): boolean {
  const dir = signingDirectory(directory)
  const sig = getEgovSignatures(permit)[role]
  if (!sig?.cmsBase64?.trim()) return false
  return egovSignatureMatchesAssignee(permit, role, sig, dir)
}

/** Устаревшая ЭЦП (другой uid или без CMS) — не блокирует новую подпись. */
export function staleEgovSignatureForRole(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): StoredEgovSignature | null {
  const sig = getEgovSignatures(permit)[role]
  if (!sig) return null
  if (validEgovRoleSignature(permit, role, directory)) return null
  if (sig.cmsBase64?.trim() || sig.signedByDisplayName?.trim() || sig.signedAtIso) {
    return sig
  }
  return null
}

/** Эффективный статус подписи: ЭЦП или legacy-галочка (только вне этапа согласования). */
export function isRoleSigned(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): boolean {
  const dir = signingDirectory(directory)
  if (validEgovRoleSignature(permit, role, dir)) return true
  if (strictEgovSigningPhase(permit)) return false
  if (role === 'performer') return !!permit.signatures.performerSigned
  if (role === 'permitter') return permit.signatures.permitterSigned
  if (role === 'issuer') return permit.signatures.issuerSigned
  if (role === 'ert') return !!permit.signatures.ertSigned
  return permit.signatures.leadExpertSigned
}

export function allRequiredSignaturesComplete(
  permit: Permit,
  directory: DemoUser[] = [],
): boolean {
  return requiredSignRoles(permit).every((role) => isRoleSigned(permit, role, directory))
}

export function assigneeUidForRole(permit: Permit, role: EgovSignRole): string {
  if (role === 'performer') return permit.performerUid
  if (role === 'permitter') return permit.permitterUid
  if (role === 'issuer') return permit.issuerUid
  if (role === 'ert') return permit.ertUid?.trim() || 'u-ert'
  return permit.leadExpertUid
}

/** UID назначенного с учётом шаблонов (demo-id ↔ Firebase по email). */
export function resolvedAssigneeUidForRole(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): string {
  const dir = signingDirectory(directory)
  if (role === 'performer') {
    return resolveNdprSignerUid(dir, 'performer', permit.performerUid)
  }
  if (role === 'permitter') {
    return resolveNdprSignerUid(dir, 'permitter', permit.permitterUid)
  }
  if (role === 'issuer') {
    return resolveNdprSignerUid(dir, 'issuer', permit.issuerUid)
  }
  if (role === 'leadExpert') {
    return resolveNdprSignerUid(dir, 'leadExpert', permit.leadExpertUid)
  }
  if (role === 'ert') {
    return resolveErtSignerUid(dir, permit.ertUid)
  }
  return assigneeUidForRole(permit, role)
}

export function actorMatchesAssigneeForRole(
  permit: Permit,
  role: EgovSignRole,
  actor: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  const assigneeUid = resolvedAssigneeUidForRole(permit, role, directory)
  if (!assigneeUid.trim()) return false
  return uidMatchesAccount(assigneeUid, actor, signingDirectory(directory))
}

/** ФИО подписанта для карточки наряда (ЭЦП → назначенный → ASOR). */
export function roleSignedByLabel(
  permit: Permit,
  role: EgovSignRole,
  resolveUser?: (uid: string) => { displayName?: string } | undefined,
): string | null {
  if (validEgovRoleSignature(permit, role, signingDirectory([]))) {
    const egovName = permit.egovSignatures?.[role]?.signedByDisplayName?.trim()
    if (egovName) return egovName
  }

  const assigneeName = resolveUser?.(assigneeUidForRole(permit, role))?.displayName?.trim()
  if (assigneeName) return assigneeName

  const idx = approvalIndexForRole(role)
  const asorName = idx >= 0 ? permit.asor?.approvals?.[idx]?.fullNamePrinted?.trim() : ''
  return asorName || null
}

/** Подпись роли для PDF: только действующая ЭЦП или подтверждённый legacy-флаг. */
export function pdfApprovalRoleSigned(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): boolean {
  const dir = signingDirectory(directory)
  if (validEgovRoleSignature(permit, role, dir)) return true
  if (strictEgovSigningPhase(permit)) return false
  return isRoleSigned(permit, role, dir)
}
