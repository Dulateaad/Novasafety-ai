import type { Permit } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { isPermitSigningRejected } from './permitRejectionDisplay'
import { isRoleSigned } from './signatureStatus'
import type { SigningInvite } from '../types/signingInvite'

function crewAckDone(permit: Permit, uid: string): boolean {
  if (!uid.trim()) return false
  if (permit.crewAckSignatures?.[uid]?.cmsBase64?.trim()) return true
  return permit.executors.some(
    (ex) => ex.userUid.trim() === uid && ex.briefingAcknowledged,
  )
}

function approvalInviteDone(permit: Permit, role: EgovSignRole): boolean {
  return isRoleSigned(permit, role)
}

/** Скрыть уведомления, если подпись/ознакомление уже есть в наряде. */
export function isSigningInviteStillActionable(
  invite: SigningInvite,
  permit: Permit | undefined,
): boolean {
  if (invite.status !== 'active') return false
  if (!permit) return false
  if (isPermitSigningRejected(permit)) return false

  if (invite.inviteType === 'crew_ack') {
    return !crewAckDone(permit, invite.assigneeUid)
  }

  const role = invite.signRole
  if (role === 'crewAck') return !crewAckDone(permit, invite.assigneeUid)
  return !approvalInviteDone(permit, role)
}

function permitById(permits: readonly Permit[]): Map<string, Permit> {
  return new Map(permits.map((p) => [p.id, p]))
}

export function filterActionableSigningInvites(
  invites: SigningInvite[],
  permits: readonly Permit[],
  existingPermitIds?: ReadonlySet<string>,
): SigningInvite[] {
  const byId = permitById(permits)
  return invites.filter((invite) => {
    if (existingPermitIds && !existingPermitIds.has(invite.permitId)) return false
    const permit = byId.get(invite.permitId)
    return isSigningInviteStillActionable(invite, permit)
  })
}

/** Уведомления о подписи, где пакет уже отклонён — показать причину вместо кнопки подписи. */
export function filterRejectedSigningInvites(
  invites: SigningInvite[],
  permits: readonly Permit[],
  existingPermitIds?: ReadonlySet<string>,
): SigningInvite[] {
  const byId = permitById(permits)
  return invites.filter((invite) => {
    if (existingPermitIds && !existingPermitIds.has(invite.permitId)) return false
    if (invite.inviteType !== 'approval') return false
    const permit = byId.get(invite.permitId)
    return Boolean(permit && isPermitSigningRejected(permit))
  })
}
