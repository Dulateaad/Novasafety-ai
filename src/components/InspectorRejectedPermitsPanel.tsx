import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { DemoUser, Permit } from '../types/domain'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import type { InspectorRejectedAction } from '../lib/inspectorRejectedPermit'
import {
  rejectionRejectorName,
  rejectionRejectorRoleLabel,
} from '../lib/permitRejectionDisplay'
import { formatStoredDateTime } from '../lib/datetimeLocal'

function RejectedPermitItem(props: {
  permit: Permit
  resolveUser: (uid: string) => DemoUser | undefined
  busy: boolean
  onResolve: (action: InspectorRejectedAction, comment: string) => Promise<void>
}) {
  const { permit, resolveUser, busy, onResolve } = props
  const rejection = permit.lastRejection!
  const [comment, setComment] = useState('')
  const trimmed = comment.trim()
  const canAct = trimmed.length >= 3 && !busy

  return (
    <li className="rejected-permits-panel__item">
      <div className="rejected-permits-panel__item-head">
        <div className="rejected-permits-panel__item-meta">
          <span className="small" style={{ fontWeight: 600, color: '#b45309' }}>
            ● Требует решения
          </span>
          <span className="strong">{permit.title}</span>
          <span className="small muted">№ {permit.registrationRefNo || '—'}</span>
        </div>
      </div>

      <div className="permit-rejection-card" role="status">
        <div className="permit-rejection-card__who">
          <span className="permit-rejection-card__who-label">Отклонено</span>
          <strong className="permit-rejection-card__who-name">
            {rejectionRejectorName(permit, resolveUser)}
          </strong>
          <span className="permit-rejection-card__who-role">
            {rejectionRejectorRoleLabel(permit)}
          </span>
        </div>
        <blockquote className="permit-rejection-card__comment">
          {rejection.comment.trim() || '—'}
        </blockquote>
        <footer className="permit-rejection-card__meta">
          <span>{formatStoredDateTime(rejection.atIso)}</span>
        </footer>
      </div>

      <label className="field" style={{ marginTop: '0.75rem' }}>
        <span className="field-label">Комментарий {INSPECTOR_ROLE_TITLE} *</span>
        <textarea
          rows={2}
          value={comment}
          disabled={busy}
          placeholder="Обоснуйте решение…"
          onChange={(e) => setComment(e.target.value)}
        />
      </label>

      <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
        <button
          type="button"
          className="btn primary small"
          disabled={!canAct}
          onClick={() => void onResolve('restore', trimmed)}
        >
          {busy ? 'Сохранение…' : 'Восстановить'}
        </button>
        <button
          type="button"
          className="btn small work-stop-inspector__annul"
          disabled={!canAct}
          onClick={() => {
            if (
              !window.confirm('Аннулировать НДПР? Это формальное закрытие наряда в системе.')
            ) {
              return
            }
            void onResolve('annul', trimmed)
          }}
        >
          Аннулировать
        </button>
        <Link className="btn ghost small" to={`/p/${permit.id}#inspector-rejected-section`}>
          Открыть наряд
        </Link>
      </div>
    </li>
  )
}

export function InspectorRejectedPermitsPanel(props: {
  permits: readonly Permit[]
  resolveUser: (uid: string) => DemoUser | undefined
  busy?: boolean
  busyPermitId?: string | null
  onResolve: (
    permitId: string,
    action: InspectorRejectedAction,
    comment: string,
  ) => Promise<void>
}) {
  const { permits, resolveUser, busy = false, busyPermitId = null, onResolve } = props
  if (permits.length === 0) return null

  return (
    <section className="rejected-permits-panel" role="status" style={{ marginBottom: '1rem' }}>
      <header className="rejected-permits-panel__header">
        <div>
          <h2 className="rejected-permits-panel__title">
            Требует решения — отклонение на согласовании
          </h2>
          <p className="rejected-permits-panel__lead">
            {INSPECTOR_ROLE_TITLE}: восстановите пакет на согласование или аннулируйте наряд.
          </p>
        </div>
      </header>
      <ul className="rejected-permits-panel__list">
        {permits.map((permit) => (
          <RejectedPermitItem
            key={permit.id}
            permit={permit}
            resolveUser={resolveUser}
            busy={busy && busyPermitId === permit.id}
            onResolve={(action, comment) => onResolve(permit.id, action, comment)}
          />
        ))}
      </ul>
    </section>
  )
}
