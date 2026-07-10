import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import type { DemoUser } from '../types/domain'
import { db, firebaseConfigured } from '../lib/firebase'
import {
  isNotificationEmailValid,
  saveNotificationEmail,
} from '../lib/notificationEmail'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

export function NotificationEmailField(props: { user: DemoUser }) {
  const { user } = props
  const { t } = useLanguage()
  const ne = t.notificationEmail
  const { showError, showInfo } = useToast()
  const [value, setValue] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured || !db) {
      setLoaded(true)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.id))
        const data = snap.data()
        if (!cancelled) {
          setValue(String(data?.notificationEmail ?? '').trim())
          setLoaded(true)
        }
      } catch {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  if (!firebaseConfigured || !loaded) return null

  async function save() {
    if (!isNotificationEmailValid(value)) {
      showError(ne.invalid)
      return
    }
    setBusy(true)
    try {
      await saveNotificationEmail(user.id, value)
      showInfo(value.trim() ? ne.saved : ne.cleared)
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="notification-email-field">
      <span className="notification-email-field__label xsmall muted">{ne.label}</span>
      <span className="notification-email-field__row">
        <input
          type="email"
          className="notification-email-field__input"
          value={value}
          placeholder={ne.placeholder}
          autoComplete="email"
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
          }}
        />
        <button
          type="button"
          className="btn ghost small"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? ne.saving : ne.save}
        </button>
      </span>
    </label>
  )
}
