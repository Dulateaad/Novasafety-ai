import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DemoUser, Permit } from '../types/domain'
import { useSession } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { canUserResubmitRejectedPermit } from '../lib/resubmitRejectedPermit'
import {
  restorePackageSessionFromPermit,
  resolvePackageResumeRoute,
} from '../lib/resumePermitPackage'

/** Кнопка «Исправить и отправить снова» для производителя после отклонения. */
export function ResubmitRejectedPermitButton(props: {
  permit: Permit
  className?: string
}) {
  const { permit, className = 'btn primary small' } = props
  const { user, userDirectory, resetRejectedPermitToDraft } = useSession()
  const { t } = useLanguage()
  const { showError, showInfo } = useToast()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)

  if (!canUserResubmitRejectedPermit(permit, user)) return null

  async function onClick() {
    if (!user) return
    setBusy(true)
    try {
      const updated = await resetRejectedPermitToDraft(permit.id)
      restorePackageSessionFromPermit(updated, { resubmitAfterRejection: true })
      showInfo(t.invites.resubmitPerformerHint)
      nav(resolvePackageResumeRoute(updated, user, userDirectory))
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy ? t.invites.resubmitBusy : t.invites.resubmitEdit}
    </button>
  )
}

export function userCanResubmitRejected(
  permit: Permit,
  user: DemoUser | null,
): boolean {
  return canUserResubmitRejectedPermit(permit, user)
}
