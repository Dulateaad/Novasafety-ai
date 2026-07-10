import { useCallback, useEffect, useState } from 'react'
import {
  dismissWorkStopPendingAlert,
  loadDismissedWorkStopPendingAlertKeys,
} from '../lib/workStopPendingAlertDismissal'

export function useDismissedWorkStopPendingAlerts(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setDismissed(new Set())
      return
    }
    void loadDismissedWorkStopPendingAlertKeys(userId).then((keys) => {
      if (!cancelled) setDismissed(keys)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const dismiss = useCallback(
    (permitId: string) => {
      if (!userId) return dismissed
      setDismissed((prev) => new Set(prev).add(permitId))
      void dismissWorkStopPendingAlert(userId, permitId).then(setDismissed)
      return dismissed
    },
    [userId, dismissed],
  )

  return { dismissed, dismiss }
}
