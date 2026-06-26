import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import {
  dismissRejectionNotice,
  loadDismissedRejectionKeys,
} from '../lib/rejectionNoticeDismissal'

export function useDismissedRejectionNotices(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    userId ? loadDismissedRejectionKeys(userId) : new Set(),
  )

  useEffect(() => {
    setDismissed(userId ? loadDismissedRejectionKeys(userId) : new Set())
  }, [userId])

  const dismiss = useCallback(
    (permit: Permit) => {
      if (!userId) return
      setDismissed(dismissRejectionNotice(userId, permit))
    },
    [userId],
  )

  return { dismissed, dismiss }
}
