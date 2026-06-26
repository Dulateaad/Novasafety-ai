import { useCallback, useEffect, useState } from 'react'
import type { PermitNotice } from '../types/permitNotice'
import {
  dismissPermitNotice,
  loadDismissedPermitNoticeIds,
} from '../lib/permitNoticeDismissal'

export function useDismissedPermitNotices(userId: string | undefined) {
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    userId ? loadDismissedPermitNoticeIds(userId) : new Set(),
  )

  useEffect(() => {
    setDismissed(userId ? loadDismissedPermitNoticeIds(userId) : new Set())
  }, [userId])

  const dismiss = useCallback(
    (notice: PermitNotice) => {
      if (!userId) return
      setDismissed(dismissPermitNotice(userId, notice))
    },
    [userId],
  )

  return { dismissed, dismiss }
}
