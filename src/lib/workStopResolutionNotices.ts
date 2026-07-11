import type { Permit } from '../types/domain'
import { isUserPermitParticipant } from './permitAccess'
import { workStopResolutionDismissKey } from './workStopNoticeDismissal'

export function workStopResolutionNoticesForUser(
  permits: readonly Permit[],
  userId: string | undefined,
  dismissed: ReadonlySet<string>,
): Permit[] {
  if (!userId) return []
  return permits.filter((permit) => {
    const key = workStopResolutionDismissKey(permit)
    if (!key || dismissed.has(key)) return false
    if (!isUserPermitParticipant(permit, userId)) return false
    const ws = permit.workStop
    return ws?.status === 'lifted' || ws?.status === 'annulled'
  })
}
