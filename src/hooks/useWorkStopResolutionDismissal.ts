import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import {
  dismissWorkStopResolutionNotice,
  loadDismissedWorkStopResolutionKeys,
  workStopResolutionDismissKey,
} from '../lib/workStopNoticeDismissal'

export function useWorkStopResolutionDismissal(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setDismissed(new Set())
      return
    }
    void loadDismissedWorkStopResolutionKeys(userId).then((keys) => {
      if (!cancelled) setDismissed(keys)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const dismiss = useCallback(
    (permit: Permit) => {
      if (!userId) return
      const key = workStopResolutionDismissKey(permit)
      if (key) setDismissed((prev) => new Set(prev).add(key))
      void dismissWorkStopResolutionNotice(userId, permit).then(setDismissed)
    },
    [userId],
  )

  return { dismissed, dismiss }
}
