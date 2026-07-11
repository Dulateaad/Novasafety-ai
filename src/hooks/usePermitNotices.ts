import { useCallback, useEffect, useState } from 'react'
import { auth, db, firebaseConfigured } from '../lib/firebase'
import { fetchPermitNotices } from '../lib/permitNotices'
import { PERMIT_NOTICES_REFRESH_EVENT } from '../lib/refreshPermitNotices'
import type { PermitNotice } from '../types/permitNotice'

const POLL_MS = 20_000

export function usePermitNotices(assigneeUid: string | undefined): PermitNotice[] {
  const [notices, setNotices] = useState<PermitNotice[]>([])
  const uid = auth?.currentUser?.uid ?? assigneeUid

  const load = useCallback(async () => {
    if (!uid) {
      setNotices([])
      return
    }
    const list = await fetchPermitNotices(firebaseConfigured ? db : null, uid)
    setNotices(list)
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setNotices([])
      return
    }

    let cancelled = false
    void (async () => {
      const list = await fetchPermitNotices(firebaseConfigured ? db : null, uid)
      if (!cancelled) setNotices(list)
    })()

    const timer = window.setInterval(() => {
      void load()
    }, POLL_MS)

    const onFocus = () => {
      void load()
    }
    const onRefresh = () => {
      void load()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener(PERMIT_NOTICES_REFRESH_EVENT, onRefresh)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(PERMIT_NOTICES_REFRESH_EVENT, onRefresh)
    }
  }, [uid, load])

  return notices
}
