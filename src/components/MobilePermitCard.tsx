import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import type { Permit } from '../types/domain'
import { formatSpecialWorkLabelsLocalized } from '../i18n/getLocale'
import { StatusBadge } from './StatusBadge'
import { PermitOnApprovalSummary } from './PermitOnApprovalSummary'
import { PermitRejectionStrip } from './PermitRejectionStrip'
import { isPermitSigningRejected } from '../lib/permitRejectionDisplay'
import { useLanguage } from '../context/LanguageContext'

interface MobilePermitCardProps {
  permit: Permit
  /** Доп. строка справа в шапке (например № или статус матрицы). */
  badge?: string
  footer?: ReactNode
  /** Показать строку «кто отклонил» (журнал: не отклонившему и не закрывшему). */
  showRejectionStrip?: boolean
  onDelete?: () => void
  deleteDisabled?: boolean
}

export function MobilePermitCard({
  permit,
  badge,
  footer,
  showRejectionStrip = true,
  onDelete,
  deleteDisabled,
}: MobilePermitCardProps) {
  const { resolveUser } = useSession()
  const { t, language } = useLanguage()
  const c = t.common

  return (
    <div className={onDelete ? 'permit-card-row' : undefined}>
      <Link to={`/p/${permit.id}`} className="permit-card">
      <div className="permit-card__top">
        <span className="permit-card__reg">
          {badge ?? (permit.registrationRefNo || '—')}
        </span>
        <StatusBadge status={permit.status} />
      </div>
      <h3 className="permit-card__title">{permit.title || c.untitled}</h3>
      <p className="permit-card__site">{permit.siteName}</p>
      <div className="permit-card__meta">
        <span>
          {formatSpecialWorkLabelsLocalized(
            permit.specialWorkActivities,
            permit.specialWorkActivity,
            language,
          )}
        </span>
      </div>
      {showRejectionStrip && isPermitSigningRejected(permit) ? (
        <PermitRejectionStrip permit={permit} resolveUser={resolveUser} compact />
      ) : null}
      {permit.status === 'on_approval' ? (
        <PermitOnApprovalSummary
          permit={permit}
          resolveUser={resolveUser}
          variant="inline"
        />
      ) : null}
      {footer ?? (
        <p className="permit-card__date muted xsmall">
          {c.updated}{' '}
          {new Date(permit.updatedAtIso).toLocaleString(
            language === 'en' ? 'en-GB' : 'ru-RU',
          )}
        </p>
      )}
      <span className="permit-card__chevron" aria-hidden>
        ›
      </span>
      </Link>
      {onDelete ? (
        <button
          type="button"
          className="btn ghost small permit-card-row__delete"
          disabled={deleteDisabled}
          onClick={() => onDelete()}
        >
          {deleteDisabled ? c.deleting : c.delete}
        </button>
      ) : null}
    </div>
  )
}
