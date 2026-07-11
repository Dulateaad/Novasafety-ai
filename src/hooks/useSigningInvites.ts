import { useCallback, useEffect, useState } from 'react'
import { auth, db, firebaseConfigured } from '../lib/firebase'
import { SIGNING_INVITES_REFRESH_EVENT } from '../lib/refreshSigningInvites'
import { fetchSigningInvites, openSigningInvites } from '../lib/signingInvites'
import type { SigningInvite } from '../types/signingInvite'

const POLL_MS = 45_000

export function useSigningInvites(
  assigneeUid: string | undefined,
  assigneeEmail?: string,
): SigningInvite[] {
  const [invites, setInvites] = useState<SigningInvite[]>([])
  const uid = auth?.currentUser?.uid ?? assigneeUid
  const email = auth?.currentUser?.email ?? assigneeEmail

  const load = useCallback(async () => {
    if (!firebaseConfigured || !db || (!uid && !email)) {
      setInvites([])
      return
    }
    const list = await fetchSigningInvites(db, uid ?? '', email)
    setInvites(list)
  }, [uid, email])

  useEffect(() => {
    if (!uid && !email) {
      setInvites([])
      return
    }

    let cancelled = false
    void (async () => {
      const list = await fetchSigningInvites(db!, uid ?? '', email)
      if (!cancelled) setInvites(list)
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
    window.addEventListener(SIGNING_INVITES_REFRESH_EVENT, onRefresh)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(SIGNING_INVITES_REFRESH_EVENT, onRefresh)
    }
  }, [uid, email, load])

  return openSigningInvites(invites)
}
