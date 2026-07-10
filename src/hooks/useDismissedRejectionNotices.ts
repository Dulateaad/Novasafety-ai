import { useCallback, useEffect, useState } from 'react'
import type { Permit } from '../types/domain'
import {
  dismissRejectionNotice,
  loadDismissedRejectionKeys,
} from '../lib/rejectionNoticeDismissal'

export function useDismissedRejectionNotices(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setDismissed(new Set())
      return
    }
    void loadDismissedRejectionKeys(userId).then((keys) => {
      if (!cancelled) setDismissed(keys)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const dismiss = useCallback(
    (permit: Permit) => {
      if (!userId) return
      const key = `${permit.id}::${permit.lastRejection?.atIso ?? ''}`
      if (permit.lastRejection?.atIso) {
        setDismissed((prev) => new Set(prev).add(key))
      }
      void dismissRejectionNotice(userId, permit).then(setDismissed)
    },
    [userId],
  )

  return { dismissed, dismiss }
}
