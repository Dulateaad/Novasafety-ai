import type { DemoUser, Permit } from '../types/domain'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import { isInspectorUser } from './inspectorAccess'
import { isPermitSigningRejected } from './permitRejectionDisplay'

export type InspectorRejectedAction = 'restore' | 'annul'

export function canInspectorResolveRejectedPermit(
  permit: Permit,
  user: DemoUser | null,
): boolean {
  if (!isInspectorUser(user)) return false
  return isPermitSigningRejected(permit)
}

export function inspectorRejectedPermitQueue(permits: readonly Permit[]): Permit[] {
  return permits.filter((p) => isPermitSigningRejected(p))
}

export function inspectorRejectedJournalMessage(
  action: InspectorRejectedAction,
  comment: string,
): string {
  if (action === 'annul') {
    return `${INSPECTOR_ROLE_TITLE} аннулировал отклонённый НДПР: ${comment}`
  }
  return `${INSPECTOR_ROLE_TITLE} вернул отклонённый НДПР на согласование: ${comment}`
}
