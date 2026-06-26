import { useCallback, useEffect, useState } from 'react'
import { auth, db, firebaseConfigured } from '../lib/firebase'
import { fetchSigningInvites, openSigningInvites } from '../lib/signingInvites'
import type { SigningInvite } from '../types/signingInvite'

const POLL_MS = 45_000

export function useSigningInvites(assigneeUid: string | undefined): SigningInvite[] {
  const [invites, setInvites] = useState<SigningInvite[]>([])
  const uid = auth?.currentUser?.uid ?? assigneeUid

  const load = useCallback(async () => {
    if (!firebaseConfigured || !db || !uid) {
      setInvites([])
      return
    }
    const list = await fetchSigningInvites(db, uid)
    setInvites(list)
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setInvites([])
      return
    }

    let cancelled = false
    void (async () => {
      const list = await fetchSigningInvites(db!, uid)
      if (!cancelled) setInvites(list)
    })()

    const timer = window.setInterval(() => {
      void load()
    }, POLL_MS)

    const onFocus = () => {
      void load()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [uid, load])

  return openSigningInvites(invites)
}
