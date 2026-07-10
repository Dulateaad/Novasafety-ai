import type { DemoUser, Permit } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { isPermitSigningRejected } from './permitRejectionDisplay'
import { permitterOnApprovalUnlocked } from './permitterApprovalGate'
import { isRoleSigned } from './signatureStatus'
import type { SigningInvite } from '../types/signingInvite'
import { isExecutorCrewAckDone } from './crewAckComplete'
import { ertGasTestBlocksErtSign } from './ertGasTestHints'

function crewAckDone(
  permit: Permit,
  uid: string,
  directory: DemoUser[] = [],
): boolean {
  return isExecutorCrewAckDone(permit, uid, directory)
}

function approvalInviteDone(
  permit: Permit,
  role: EgovSignRole,
  directory: DemoUser[] = [],
): boolean {
  return isRoleSigned(permit, role, directory)
}

/** Скрыть уведомления, если подпись/ознакомление уже есть в наряде. */
export function isSigningInviteStillActionable(
  invite: SigningInvite,
  permit: Permit | undefined,
  directory: DemoUser[] = [],
): boolean {
  if (invite.status !== 'active') return false
  if (!permit) return false
  if (isPermitSigningRejected(permit)) return false

  if (invite.inviteType === 'crew_ack') {
    return !crewAckDone(permit, invite.assigneeUid, directory)
  }

  const role = invite.signRole
  if (role === 'crewAck') return !crewAckDone(permit, invite.assigneeUid, directory)
  if (role === 'ert' && ertGasTestBlocksErtSign(permit)) return false
  return !approvalInviteDone(permit, role)
}

function permitById(permits: readonly Permit[]): Map<string, Permit> {
  return new Map(permits.map((p) => [p.id, p]))
}

export function filterSigningInvitesForViewer(
  invites: SigningInvite[],
  permits: readonly Permit[],
  user: DemoUser | null,
  directory: DemoUser[] = [],
): SigningInvite[] {
  if (!user || user.role !== 'permitter') return invites
  const byId = new Map(permits.map((p) => [p.id, p]))
  return invites.filter((invite) => {
    if (invite.inviteType !== 'approval' || invite.signRole !== 'permitter') return true
    const permit = byId.get(invite.permitId)
    if (!permit) return false
    return permitterOnApprovalUnlocked(permit, directory)
  })
}

export function filterActionableSigningInvites(
  invites: SigningInvite[],
  permits: readonly Permit[],
  existingPermitIds?: ReadonlySet<string>,
  directory: DemoUser[] = [],
): SigningInvite[] {
  const byId = permitById(permits)
  return invites.filter((invite) => {
    if (existingPermitIds && !existingPermitIds.has(invite.permitId)) return false
    const permit = byId.get(invite.permitId)
    return isSigningInviteStillActionable(invite, permit, directory)
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
