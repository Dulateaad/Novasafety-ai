import { useCallback, useEffect, useState } from 'react'
import type { PermitNotice } from '../types/permitNotice'
import {
  dismissPermitNotice,
  loadDismissedPermitNoticeIds,
} from '../lib/permitNoticeDismissal'

export function useDismissedPermitNotices(
  userId: string | undefined,
  notices: readonly PermitNotice[] = [],
) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) {
      setDismissed(new Set())
      return
    }
    setDismissed(loadDismissedPermitNoticeIds(userId, notices))
  }, [userId, notices])

  const dismiss = useCallback(
    (notice: PermitNotice) => {
      if (!userId) return
      setDismissed((prev) => new Set(prev).add(notice.id))
      void dismissPermitNotice(userId, notice).then((keys) => setDismissed(keys))
    },
    [userId],
  )

  return { dismissed, dismiss }
}
