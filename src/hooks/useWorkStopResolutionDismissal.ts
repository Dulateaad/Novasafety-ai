import { useCallback, useState } from 'react'
import type { Permit } from '../types/domain'
import {
  dismissWorkStopResolutionNotice,
  loadDismissedWorkStopResolutionKeys,
} from '../lib/workStopNoticeDismissal'

export function useWorkStopResolutionDismissal(userId: string | undefined) {
  const [dismissed, setDismissed] = useState(() =>
    userId ? loadDismissedWorkStopResolutionKeys(userId) : new Set<string>(),
  )

  const dismiss = useCallback(
    (permit: Permit) => {
      if (!userId) return
      setDismissed(dismissWorkStopResolutionNotice(userId, permit))
    },
    [userId],
  )

  return { dismissed, dismiss }
}
