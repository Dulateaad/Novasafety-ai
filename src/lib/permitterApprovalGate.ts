import type { DemoUser, Permit } from '../types/domain'
import { allCrewAcknowledged } from './crewAckComplete'
import { uidMatchesAccount } from './permitAccess'
import { isRoleSigned } from './signatureStatus'

/** Производитель подписал и бригада ознакомилась — можно открывать шаг допускающего. */
export function permitterOnApprovalUnlocked(
  permit: Permit,
  directory: DemoUser[] = [],
): boolean {
  return (
    isRoleSigned(permit, 'performer', directory) &&
    allCrewAcknowledged(permit, directory)
  )
}

export function isAssignedPermitter(
  permit: Permit,
  user: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  const assigned = permit.permitterUid?.trim()
  if (!assigned) return false
  return uidMatchesAccount(assigned, user, directory)
}

/** Наряд «На согласовании» виден допускающему только после бригады. */
export function permitVisibleToPermitter(
  permit: Permit,
  user: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  if (permit.status === 'draft') return false
  if (!isAssignedPermitter(permit, user, directory)) return false
  if (permit.status === 'on_approval') {
    return permitterOnApprovalUnlocked(permit, directory)
  }
  return true
}
