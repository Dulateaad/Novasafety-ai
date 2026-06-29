import { useCallback, useState } from 'react'
import {
  dismissWorkStopPendingAlert,
  loadDismissedWorkStopPendingAlertKeys,
} from '../lib/workStopPendingAlertDismissal'

export function useDismissedWorkStopPendingAlerts(userId: string | undefined) {
  const [dismissed, setDismissed] = useState(() =>
    userId ? loadDismissedWorkStopPendingAlertKeys(userId) : new Set<string>(),
  )

  const dismiss = useCallback(
    (permitId: string) => {
      if (!userId) return dismissed
      setDismissed(dismissWorkStopPendingAlert(userId, permitId))
      return loadDismissedWorkStopPendingAlertKeys(userId)
    },
    [userId, dismissed],
  )

  return { dismissed, dismiss }
}
