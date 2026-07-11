import { Link } from 'react-router-dom'
import type { DemoUser, Permit } from '../types/domain'
import type { SigningInvite } from '../types/signingInvite'
import { formatStoredDateTime } from '../lib/datetimeLocal'
import { permitHrefForSigningInvite } from '../lib/signingInvites'
import { PermitRejectionNotice } from './PermitRejectionNotice'
import { useLanguage } from '../context/LanguageContext'

export function SigningInvitesPanel(props: {
  invites: SigningInvite[]
  title?: string
  permitCreatedAtIso?: (permitId: string) => string | undefined
  variant?: 'sign' | 'ack'
}) {
  const { t } = useLanguage()
  const { invites, title, permitCreatedAtIso, variant } = props
  const i = t.invites
  const resolvedTitle =
    title ?? (variant === 'ack' ? i.ackTitle : variant === 'sign' ? i.signTitle : i.signTitle)
  if (invites.length === 0) return null

  return (
    <section className="card alert" role="status" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{resolvedTitle}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {invites[0]?.inviteType === 'crew_ack' ? i.ackHint : i.signHint}
      </p>
      <ul className="compact-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="card"
            style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
          >
            <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <span
                className="small"
                style={{
                  fontWeight: 600,
                  color: invite.status === 'active' ? '#0b2147' : '#666',
                }}
              >
                {invite.status === 'active' ? i.activeNow : i.waitingQueue}
              </span>
              <span className="strong">{invite.permitTitle}</span>
              <span className="small muted">№ {invite.registrationRefNo || '—'}</span>
              <span className="small muted">
                · {t.common.created}{' '}
                {formatStoredDateTime(
                  permitCreatedAtIso?.(invite.permitId) || invite.createdAtIso,
                )}
              </span>
            </div>
            <p className="small" style={{ margin: '0.5rem 0 0.35rem' }}>
              {invite.stepLabel}
            </p>
            <p className="muted xsmall" style={{ margin: '0 0 0.5rem' }}>
              {invite.message}
              {invite.assigneeEmail ? ` · ${i.loginPrefix} ${invite.assigneeEmail}` : ''}
            </p>
            {invite.status === 'active' ? (
              <Link
                className="btn primary small"
                to={permitHrefForSigningInvite(invite)}
              >
                {invite.inviteType === 'crew_ack' ? i.acknowledge : i.openAndSign}
              </Link>
            ) : (
              <span className="muted xsmall">
                {invite.inviteType === 'crew_ack' ? i.ackPending : i.signPending}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SigningRejectedInvitesPanel(props: {
  invites: SigningInvite[]
  permits: readonly Permit[]
  resolveUser: (uid: string) => DemoUser | undefined
  permitCreatedAtIso?: (permitId: string) => string | undefined
}) {
  const { t } = useLanguage()
  const { invites, permits, resolveUser, permitCreatedAtIso } = props
  const i = t.invites
  if (invites.length === 0) return null

  const byId = new Map(permits.map((p) => [p.id, p]))

  return (
    <section className="rejected-permits-panel" role="alert" style={{ marginBottom: '1rem' }}>
      <header className="rejected-permits-panel__header">
        <span className="rejected-permits-panel__badge" aria-hidden>
          ✕
        </span>
        <div>
          <h2 className="rejected-permits-panel__title">{i.rejectedTitle}</h2>
          <p className="rejected-permits-panel__lead">{i.rejectedHint}</p>
        </div>
      </header>
      <ul className="rejected-permits-panel__list">
        {invites.map((invite) => {
          const permit = byId.get(invite.permitId)
          return (
            <li key={invite.id} className="rejected-permits-panel__item">
              <div className="rejected-permits-panel__item-head">
                <div className="rejected-permits-panel__item-meta">
                  <span className="permit-rejection-card__badge">{i.rejectedBadge}</span>
                  <span className="strong">{invite.permitTitle}</span>
                  <span className="small muted">№ {invite.registrationRefNo || '—'}</span>
                  <span className="small muted">
                    · {t.common.created}{' '}
                    {formatStoredDateTime(
                      permitCreatedAtIso?.(invite.permitId) || invite.createdAtIso,
                    )}
                  </span>
                </div>
              </div>
              <p className="small" style={{ margin: '0 0 0.35rem', color: 'var(--text)' }}>
                {invite.stepLabel}
              </p>
              {permit ? (
                <PermitRejectionNotice permit={permit} resolveUser={resolveUser} variant="card" />
              ) : (
                <p className="permit-rejection-card__comment" style={{ margin: 0 }}>
                  {i.rejectedReasonFallback}
                </p>
              )}
              <div className="rejected-permits-panel__actions">
                <Link className="btn ghost small" to={`/p/${invite.permitId}#signatures-section`}>
                  {t.common.openPermit}
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
