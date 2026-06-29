import { useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import {
  canInspectorResolveRejectedPermit,
  type InspectorRejectedAction,
} from '../lib/inspectorRejectedPermit'
import {
  rejectionRejectorName,
  rejectionRejectorRoleLabel,
} from '../lib/permitRejectionDisplay'
import { formatStoredDateTime } from '../lib/datetimeLocal'

export function InspectorRejectedPermitPanel(props: {
  permit: Permit
  actor: DemoUser
  resolveUser: (uid: string) => DemoUser | undefined
  busy: boolean
  onResolve: (action: InspectorRejectedAction, comment: string) => void
}) {
  const { permit, actor, resolveUser, busy, onResolve } = props
  const rejection = permit.lastRejection
  const canResolve = canInspectorResolveRejectedPermit(permit, actor)
  const [comment, setComment] = useState('')

  if (!rejection || !canResolve) return null

  const trimmed = comment.trim()
  const canAct = trimmed.length >= 3 && !busy

  return (
    <section
      className="work-stop-inspector"
      id="inspector-rejected-section"
      role="region"
      aria-labelledby="inspector-rejected-title"
    >
      <div className="work-stop-inspector__head">
        <span className="work-stop-inspector__badge">Требует решения</span>
        <h2 id="inspector-rejected-title" className="work-stop-inspector__title">
          Отклонение пакета на согласовании
        </h2>
        <p className="work-stop-inspector__hint muted small">
          {INSPECTOR_ROLE_TITLE}: верните наряд на согласование или аннулируйте его с
          комментарием.
        </p>
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

      <div className="work-stop-inspector__resolve">
        <label className="field">
          <span className="field-label">Комментарий {INSPECTOR_ROLE_TITLE} *</span>
          <textarea
            rows={3}
            value={comment}
            disabled={busy}
            placeholder="Обоснуйте решение: почему возвращаете на согласование или аннулируете…"
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <div className="work-stop-inspector__actions">
          <button
            type="button"
            className="btn primary"
            disabled={!canAct}
            onClick={() => onResolve('restore', trimmed)}
          >
            {busy ? 'Сохранение…' : 'Восстановить'}
          </button>
          <button
            type="button"
            className="btn work-stop-inspector__annul"
            disabled={!canAct}
            onClick={() => {
              if (
                !window.confirm(
                  'Аннулировать НДПР? Это формальное закрытие наряда в системе.',
                )
              ) {
                return
              }
              onResolve('annul', trimmed)
            }}
          >
            Аннулировать НДПР
          </button>
        </div>
      </div>
    </section>
  )
}
