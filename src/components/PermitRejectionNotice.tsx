import type { CSSProperties } from 'react'
import type { Permit, DemoUser } from '../types/domain'
import {
  formatRejectionDateTime,
  rejectionRejectorName,
  rejectionRejectorRoleLabel,
} from '../lib/permitRejectionDisplay'
import { useLanguage } from '../context/LanguageContext'

type Props = {
  permit: Permit
  resolveUser: (uid: string) => DemoUser | undefined
  className?: string
  style?: CSSProperties
  variant?: 'banner' | 'card' | 'inline'
}

export function PermitRejectionNotice({
  permit,
  resolveUser,
  className,
  style,
  variant = 'banner',
}: Props) {
  const { t } = useLanguage()
  const r = t.rejection
  const i = t.invites
  const ui = t.signingUi
  const rejection = permit.lastRejection
  if (!rejection) return null

  const comment = rejection.comment.trim() || r.reasonFallback
  const name = rejectionRejectorName(permit, resolveUser)
  const role = rejectionRejectorRoleLabel(permit)
  const when = formatRejectionDateTime(rejection.atIso)

  if (variant === 'card') {
    return (
      <div
        className={['permit-rejection-card', className].filter(Boolean).join(' ')}
        role="alert"
        style={style}
      >
        <span className="permit-rejection-card__badge">{i.rejectedTitle}</span>
        <div className="permit-rejection-card__who">
          <span className="permit-rejection-card__who-label">{ui.reject}</span>
          <strong className="permit-rejection-card__who-name">{name}</strong>
          <span className="permit-rejection-card__who-role">{role}</span>
        </div>
        <div className="permit-rejection-card__comment-wrap">
          <span className="permit-rejection-card__comment-label">{r.commentLabel}</span>
          <blockquote className="permit-rejection-card__comment">{comment}</blockquote>
        </div>
        <footer className="permit-rejection-card__meta">
          <span>{when}</span>
        </footer>
      </div>
    )
  }

  return (
    <div
      className={[
        'permit-rejection-notice',
        variant === 'inline' ? 'permit-rejection-notice--inline' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
      style={style}
    >
      <div className="permit-rejection-notice__head">
        <span className="permit-rejection-notice__icon" aria-hidden>
          ✕
        </span>
        <div className="permit-rejection-notice__head-text">
          <span className="permit-rejection-notice__eyebrow">{ui.reject}</span>
          <strong className="permit-rejection-notice__name">{name}</strong>
          <span className="permit-rejection-notice__role">{role}</span>
        </div>
      </div>
      <p className="permit-rejection-notice__comment">{comment}</p>
      <div className="permit-rejection-notice__meta">{when}</div>
    </div>
  )
}
