import { useCallback, useEffect, useState } from 'react'
import { auth, db, firebaseConfigured } from '../lib/firebase'
import { fetchWorkStopAlerts } from '../lib/workStopAlerts'
import { WORK_STOP_ALERTS_REFRESH_EVENT } from '../lib/refreshWorkStopAlerts'
import type { WorkStopAlert } from '../types/workStop'

const POLL_MS = 20_000

export function useWorkStopAlerts(assigneeUid: string | undefined): WorkStopAlert[] {
  const [alerts, setAlerts] = useState<WorkStopAlert[]>([])
  const uid = auth?.currentUser?.uid ?? assigneeUid

  const load = useCallback(async () => {
    if (!uid) {
      setAlerts([])
      return
    }
    const list = await fetchWorkStopAlerts(firebaseConfigured ? db : null, uid)
    setAlerts(list)
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setAlerts([])
      return
    }

    let cancelled = false
    void (async () => {
      const list = await fetchWorkStopAlerts(firebaseConfigured ? db : null, uid)
      if (!cancelled) setAlerts(list)
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
    window.addEventListener(WORK_STOP_ALERTS_REFRESH_EVENT, onRefresh)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(WORK_STOP_ALERTS_REFRESH_EVENT, onRefresh)
    }
  }, [uid, load])

  return alerts
}
