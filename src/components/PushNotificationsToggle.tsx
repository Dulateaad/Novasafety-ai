import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import {
  disablePush,
  enablePush,
  pushEnabledLocally,
  pushSupported,
  type ForegroundPush,
} from '../lib/push'

export function PushNotificationsToggle(props: { userId: string }) {
  const { userId } = props
  const { t } = useLanguage()
  const { showInfo, showError } = useToast()
  const [visible, setVisible] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  const onForeground = useCallback(
    (n: ForegroundPush) => {
      const msg = n.body ? `${n.title} — ${n.body}` : n.title
      showInfo(msg)
    },
    [showInfo],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ok = await pushSupported()
      if (cancelled) return
      setVisible(ok)
      const local = pushEnabledLocally()
      setEnabled(local)
      if (ok && local) {
        const r = await enablePush(userId, onForeground)
        if (!cancelled) setEnabled(r.ok || pushEnabledLocally())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, onForeground])

  if (!visible) return null

  async function toggle() {
    setBusy(true)
    try {
      if (enabled) {
        await disablePush(userId)
        setEnabled(false)
        showInfo(t.layout.pushDisabled)
        return
      }
      const r = await enablePush(userId, onForeground)
      if (r.ok) {
        setEnabled(true)
        showInfo(t.layout.pushEnabled)
        return
      }
      if (r.reason === 'denied') {
        showError(t.layout.pushBlocked)
        return
      }
      showError(t.layout.pushFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`btn ghost small user-bar__push${enabled ? ' user-bar__push--on' : ''}`}
      aria-pressed={enabled}
      aria-label={enabled ? t.layout.pushDisableAria : t.layout.pushEnableAria}
      title={enabled ? t.layout.pushDisable : t.layout.pushEnable}
      disabled={busy}
      onClick={() => void toggle()}
    >
      {enabled ? t.layout.pushOn : t.layout.pushOff}
    </button>
  )
}

/** Снять push-токен при выходе (если был включён). */
export async function disablePushOnSignOut(userId: string): Promise<void> {
  if (!pushEnabledLocally()) return
  await disablePush(userId)
}
