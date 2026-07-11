import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import { useLanguage } from '../context/LanguageContext'
import { canCloseNdprEarly, closeNdprEarlyDeniedReason } from '../lib/closeNdprEarly'

export function PermitEarlyCloseCard(props: {
  permit: Permit
  actor: DemoUser
  userDirectory?: DemoUser[]
  busy?: boolean
  onClose: () => void
}) {
  const { permit, actor, userDirectory = [], busy, onClose } = props
  const { t } = useLanguage()
  const cl = t.closure
  const canClose = canCloseNdprEarly(permit, actor, userDirectory)
  const hint = closeNdprEarlyDeniedReason(permit, actor, userDirectory)

  if (actor.role !== 'performer' && actor.role !== 'coordinator') return null
  if (['closed', 'archived', 'annulled', 'on_approval', 'draft'].includes(permit.status)) {
    return null
  }

  return (
    <section className="card permit-early-close" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{cl.closeButton}</h2>
      {canClose ? (
        <>
          <p className="muted small">{t.confirm.closeEarly}</p>
          <button
            type="button"
            className="btn primary small"
            disabled={busy}
            onClick={onClose}
          >
            {busy ? cl.closeBusy : cl.closeButton}
          </button>
        </>
      ) : (
        <p className="muted small">{hint}</p>
      )}
    </section>
  )
}
