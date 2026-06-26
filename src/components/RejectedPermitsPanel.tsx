import { Link } from 'react-router-dom'
import type { DemoUser, Permit } from '../types/domain'
import { formatStoredDateTime } from '../lib/datetimeLocal'
import { PermitRejectionNotice } from './PermitRejectionNotice'
import { PermitOnApprovalSummary } from './PermitOnApprovalSummary'
import { StatusBadge } from './StatusBadge'
import { useLanguage } from '../context/LanguageContext'

type Props = {
  permits: readonly Permit[]
  resolveUser: (uid: string) => DemoUser | undefined
  onDismiss: (permit: Permit) => void
}

export function RejectedPermitsPanel({ permits, resolveUser, onDismiss }: Props) {
  const { t } = useLanguage()
  const r = t.rejection
  const i = t.invites
  const c = t.common
  if (permits.length === 0) return null

  return (
    <section className="rejected-permits-panel" role="alert">
      <header className="rejected-permits-panel__header">
        <div>
          <h2 className="rejected-permits-panel__title">{i.rejectedTitle}</h2>
          <p className="rejected-permits-panel__lead">{i.rejectedHint}</p>
        </div>
      </header>

      <ul className="rejected-permits-panel__list">
        {permits.map((permit) => (
          <li key={permit.id} className="rejected-permits-panel__item">
            <div className="rejected-permits-panel__item-head">
              <div className="rejected-permits-panel__item-meta">
                <StatusBadge status={permit.status} />
                <span className="strong">{permit.title}</span>
                <span className="small muted">№ {permit.registrationRefNo || c.na}</span>
                <span className="small muted">
                  · {c.created} {formatStoredDateTime(permit.createdAtIso)}
                </span>
              </div>
              <button
                type="button"
                className="rejected-permits-panel__dismiss"
                aria-label={r.closeAria}
                title={r.closeTitle}
                onClick={() => onDismiss(permit)}
              >
                ✕
              </button>
            </div>

            <PermitRejectionNotice permit={permit} resolveUser={resolveUser} variant="card" />

            <PermitOnApprovalSummary
              permit={permit}
              resolveUser={resolveUser}
              variant="inline"
              showRejectionNotice={false}
            />

            <Link
              className="btn ghost small"
              to={`/p/${permit.id}#signatures-section`}
              style={{ marginTop: '0.65rem' }}
            >
              {c.openPermit}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
