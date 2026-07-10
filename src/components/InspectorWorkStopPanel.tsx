import { useEffect, useState } from 'react'
import type { Permit, DemoUser } from '../types/domain'
import { INSPECTOR_ROLE_TITLE, ROLE_LABELS } from '../types/domain'
import {
  canInspectorAnnulPermit,
  canInspectorResolveWorkStop,
  inspectorDeniedAnnulReason,
  isInspectorUser,
} from '../lib/inspectorAccess'
import { workStopPhotoDataUrl } from '../lib/workStopPhoto'
import { formatStoredDateTime } from '../lib/datetimeLocal'
import {
  dismissWorkStopResolutionNotice,
  isWorkStopResolutionDismissed,
} from '../lib/workStopNoticeDismissal'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import { WorkStopReasonField } from './WorkStopReasonField'
import { useLanguage } from '../context/LanguageContext'

export function InspectorWorkStopPanel(props: {
  permit: Permit
  actor: DemoUser
  busy: boolean
  onResolve: (action: WorkStopResolveAction, comment: string) => void
}) {
  const { permit, actor, busy, onResolve } = props
  const { t } = useLanguage()
  const wsUi = t.workStop
  const ws = permit.workStop
  const canResolve = canInspectorResolveWorkStop(permit, actor)
  const canAnnul = canInspectorAnnulPermit(actor)
  const [comment, setComment] = useState('')

  if (!ws || ws.status !== 'pending') return null

  const trimmed = comment.trim()
  const canAct = canResolve && trimmed.length >= 3 && !busy
  const roleLabel =
    ws.initiatedByRole in ROLE_LABELS
      ? ROLE_LABELS[ws.initiatedByRole as keyof typeof ROLE_LABELS]
      : ws.initiatedByRole

  return (
    <section
      className="work-stop-inspector"
      id="work-stop-section"
      role="region"
      aria-labelledby="work-stop-inspector-title"
    >
      <div className="work-stop-inspector__head">
        <span className="work-stop-inspector__badge">Требует решения</span>
        <h2 id="work-stop-inspector-title" className="work-stop-inspector__title">
          Остановка работ
        </h2>
        {!canResolve ? (
          <p className="work-stop-inspector__hint muted small">
            {isInspectorUser(actor)
              ? 'Ожидается активная остановка работ по этому наряду.'
              : inspectorDeniedAnnulReason(actor)}
          </p>
        ) : (
          <p className="work-stop-inspector__hint muted small">
            {INSPECTOR_ROLE_TITLE}: восстановите работу или аннулируйте наряд с
            комментарием.
          </p>
        )}
      </div>

      <div className="work-stop-inspector__facts">
        <div className="work-stop-inspector__fact">
          <span className="work-stop-inspector__fact-label">Причина</span>
          <p className="work-stop-inspector__fact-value">{ws.reason}</p>
        </div>
        <div className="work-stop-inspector__fact">
          <span className="work-stop-inspector__fact-label">Инициатор</span>
          <p className="work-stop-inspector__fact-value">
            {ws.initiatedByName}
            <span className="work-stop-inspector__fact-meta">{roleLabel}</span>
          </p>
        </div>
        <div className="work-stop-inspector__fact">
          <span className="work-stop-inspector__fact-label">Время</span>
          <p className="work-stop-inspector__fact-value">{formatStoredDateTime(ws.atIso)}</p>
        </div>
        <div className="work-stop-inspector__fact">
          <span className="work-stop-inspector__fact-label">Объект</span>
          <p className="work-stop-inspector__fact-value">{permit.siteName || '—'}</p>
        </div>
      </div>

      {ws.photo ? (
        <figure className="work-stop-inspector__photo">
          <img src={workStopPhotoDataUrl(ws.photo)} alt="Фото к остановке работ" />
          <figcaption className="xsmall muted">{ws.photo.fileName}</figcaption>
        </figure>
      ) : null}

      {canResolve ? (
        <div className="work-stop-inspector__resolve">
          <WorkStopReasonField
            id={`work-stop-inspector-comment-${permit.id}`}
            label={`Комментарий ${INSPECTOR_ROLE_TITLE} *`}
            placeholder={wsUi.resolvePlaceholder}
            value={comment}
            disabled={busy}
            rows={4}
            onChange={setComment}
          />
          <div className="work-stop-inspector__actions">
            <button
              type="button"
              className="btn work-stop-inspector__lift"
              disabled={!canAct}
              onClick={() => onResolve('lift', trimmed)}
            >
              {busy ? 'Сохранение…' : 'Восстановить работу'}
            </button>
            {canAnnul ? (
              <button
                type="button"
                className="btn work-stop-inspector__annul"
                disabled={!canAct}
                onClick={() => {
                  if (
                    !window.confirm(wsUi.annulConfirm)
                  ) {
                    return
                  }
                  onResolve('annul', trimmed)
                }}
              >
                Аннулировать НДПР
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="work-stop-inspector__waiting muted small">
          Ожидается решение {INSPECTOR_ROLE_TITLE}.
        </p>
      )}
    </section>
  )
}

export function WorkStopStatusBanner(props: { permit: Permit; userId?: string }) {
  const { permit, userId } = props
  const ws = permit.workStop
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setDismissed(false)
      return
    }
    void isWorkStopResolutionDismissed(userId, permit).then((v) => {
      if (!cancelled) setDismissed(v)
    })
    return () => {
      cancelled = true
    }
  }, [userId, permit])

  if (!ws || dismissed) return null

  function handleDismiss() {
    if (!userId) return
    setDismissed(true)
    void dismissWorkStopResolutionNotice(userId, permit)
  }

  if (ws.status === 'pending' && permit.status === 'suspended') {
    return (
      <section className="work-stop-banner work-stop-banner--active" role="status">
        <div className="work-stop-banner__icon" aria-hidden>
          ⏸
        </div>
        <div className="work-stop-banner__body">
          <span className="work-stop-banner__eyebrow">Работы приостановлены</span>
          <p className="work-stop-banner__reason">{ws.reason}</p>
          <p className="work-stop-banner__meta muted xsmall">
            {ws.initiatedByName} · {formatStoredDateTime(ws.atIso)} · ожидает{' '}
            {INSPECTOR_ROLE_TITLE}
          </p>
        </div>
      </section>
    )
  }

  if (ws.status === 'lifted' || ws.status === 'annulled') {
    const lifted = ws.status === 'lifted'
    return (
      <section
        className={`work-stop-banner work-stop-banner--resolved ${
          lifted ? 'work-stop-banner--lifted' : 'work-stop-banner--annulled'
        }`}
        role="status"
      >
        <div className="work-stop-banner__icon" aria-hidden>
          {lifted ? '✓' : '✕'}
        </div>
        <div className="work-stop-banner__body">
          <span className="work-stop-banner__eyebrow">
            {lifted ? 'Остановка снята' : 'Наряд аннулирован'}
          </span>
          <p className="work-stop-banner__reason">{ws.inspectorComment}</p>
          <p className="work-stop-banner__meta muted xsmall">
            {ws.resolvedByName ?? INSPECTOR_ROLE_TITLE}
            {ws.resolvedAtIso ? ` · ${formatStoredDateTime(ws.resolvedAtIso)}` : ''}
          </p>
        </div>
        {userId ? (
          <button
            type="button"
            className="work-stop-banner__dismiss"
            aria-label="Закрыть уведомление"
            onClick={handleDismiss}
          >
            ✕
          </button>
        ) : null}
      </section>
    )
  }

  return null
}
