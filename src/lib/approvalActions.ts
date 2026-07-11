import type { DemoUser, Permit, UserRole } from '../types/domain'
import { isUserOnPermitCrew } from './permitAccess'
import { isPermitSigningRejected } from './permitRejectionDisplay'

/** Роли, которые могут отклонить наряд на этапе согласования. */
const REJECT_PERMIT_ROLES: ReadonlySet<UserRole> = new Set([
  'coordinator',
  'performer',
  'permitter',
  'issuer',
  'leadExpert',
  'ert',
  'safety',
  'contractor',
  'executor',
])

export function canUserRejectPermit(
  permit: Permit,
  user: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  if (permit.status !== 'on_approval') return false
  if (isPermitSigningRejected(permit)) return false
  if (!REJECT_PERMIT_ROLES.has(user.role)) return false
  if (user.role === 'executor') {
    return isUserOnPermitCrew(permit, user.id, user, directory)
  }
  if (user.role === 'contractor') {
    return Boolean(permit.isContractorPermit)
  }
  return true
}

export function rejectionPatch(comment: string, user: DemoUser): Partial<Permit> {
  return {
    lastRejection: {
      atIso: new Date().toISOString(),
      byUid: user.id,
      byRole: user.role,
      comment: comment.trim(),
    },
    egovSignatures: {},
    signatures: {
      performerSigned: false,
      issuerSigned: false,
      permitterSigned: false,
      leadExpertSigned: false,
      ertSigned: false,
    },
  }
}
