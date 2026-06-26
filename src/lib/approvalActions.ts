import type { DemoUser, Permit } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import { assigneeUidForRole } from './signatureStatus'

export function canUserRejectPermit(permit: Permit, user: DemoUser): boolean {
  if (permit.status !== 'on_approval') return false
  if (user.role === 'coordinator') return true
  const roles: EgovSignRole[] = ['performer', 'permitter', 'issuer', 'leadExpert']
  return roles.some(
    (role) => user.role === role && user.id === assigneeUidForRole(permit, role),
  )
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
