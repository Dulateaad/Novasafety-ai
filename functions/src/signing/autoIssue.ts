import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import { nextRoleToSign, requiredSignRoles } from './approvalSequence'
import { permitRequiresErtApproval } from './fireWorkApproval'

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

function allRequiredSignaturesComplete(permit: DocumentData): boolean {
  return requiredSignRoles(permit).every((role) => isRoleSigned(permit, role))
}

export function maybeAutoIssuePatch(
  permit: DocumentData,
): { status: 'issued' } | null {
  if (String(permit.status ?? '') !== 'on_approval') return null
  if (nextRoleToSign(permit) !== null) return null
  if (!allRequiredSignaturesComplete(permit)) return null
  return { status: 'issued' }
}

export async function applyAutoIssueIfReady(
  db: Firestore,
  permitId: string,
  permit: DocumentData,
  actor: { uid: string; role?: string },
): Promise<boolean> {
  const patch = maybeAutoIssuePatch(permit)
  if (!patch) return false
  await db.collection('permits').doc(permitId).update({
    ...patch,
    updatedAtIso: new Date().toISOString(),
  })
  await db.collection('permits').doc(permitId).collection('journal').add({
    permitId,
    atIso: new Date().toISOString(),
    actorUid: actor.uid,
    actorRole: actor.role ?? 'coordinator',
    kind: 'status_change',
    message: 'Статус: on_approval → issued (все подписи согласующих получены)',
    meta: { from: 'on_approval', to: 'issued', auto: true },
  })
  return true
}

export { permitRequiresErtApproval }
