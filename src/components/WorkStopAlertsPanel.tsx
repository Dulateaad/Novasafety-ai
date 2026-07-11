import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Permit } from '../types/domain'
import { INSPECTOR_ROLE_TITLE, ROLE_LABELS } from '../types/domain'
import type { WorkStopAlert } from '../types/workStop'
import { formatStoredDateTime } from '../lib/datetimeLocal'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import { WorkStopReasonField } from './WorkStopReasonField'
import { useLanguage } from '../context/LanguageContext'

type QueueItem = {
  permitId: string
  title: string
  siteName: string
  atIso: string
  reason: string
  initiatedByName: string
  initiatedByRole: string
}

function toQueueItem(permit: Permit): QueueItem {
  const ws = permit.workStop!
  return {
    permitId: permit.id,
    title: permit.title,
    siteName: permit.siteName,
    atIso: ws.atIso,
    reason: ws.reason,
    initiatedByName: ws.initiatedByName,
    initiatedByRole: ws.initiatedByRole,
  }
}

function alertToQueueItem(alert: WorkStopAlert, permit?: Permit): QueueItem {
  const ws = permit?.workStop
  return {
    permitId: alert.permitId,
    title: alert.permitTitle || permit?.title || 'Наряд',
    siteName: alert.siteName || permit?.siteName || '',
    atIso: alert.atIso,
    reason: alert.reason,
    initiatedByName: alert.initiatedByName,
    initiatedByRole: ws?.initiatedByRole ?? '',
  }
}

function roleLabel(role: string): string {
  if (role in ROLE_LABELS) {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS]
  }
  return role || '—'
}

function WorkStopAlertItem(props: {
  item: QueueItem
  busy: boolean
  onResolve: (action: WorkStopResolveAction, comment: string) => Promise<void>
  onDismiss: () => void
}) {
  const { item, busy, onResolve, onDismiss } = props
  const { t } = useLanguage()
  const wsUi = t.workStop
  const [comment, setComment] = useState('')
  const trimmed = comment.trim()
  const canAct = trimmed.length >= 3 && !busy

  return (
    <li className="rejected-permits-panel__item work-stop-alerts__item">
      <div className="rejected-permits-panel__item-head">
        <div className="rejected-permits-panel__item-meta">
          <span className="small" style={{ fontWeight: 600, color: '#b45309' }}>
            ● Требует решения
          </span>
          <span className="strong">{item.title}</span>
          {item.siteName ? <span className="small muted">· {item.siteName}</span> : null}
          <span className="small muted">· {formatStoredDateTime(item.atIso)}</span>
        </div>
        <button
          type="button"
          className="rejected-permits-panel__dismiss"
          aria-label="Скрыть уведомление"
          title="Скрыть уведомление"
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>

      <div className="permit-rejection-card" role="status">
        <div className="permit-rejection-card__who">
          <span className="permit-rejection-card__who-label">Остановка работ</span>
          <strong className="permit-rejection-card__who-name">{item.initiatedByName}</strong>
          <span className="permit-rejection-card__who-role">{roleLabel(item.initiatedByRole)}</span>
        </div>
        <blockquote className="permit-rejection-card__comment">{item.reason}</blockquote>
      </div>

      <WorkStopReasonField
        id={`work-stop-alert-comment-${item.permitId}`}
        label={`Комментарий ${INSPECTOR_ROLE_TITLE} *`}
        placeholder={wsUi.resolvePlaceholder}
        value={comment}
        disabled={busy}
        rows={3}
        onChange={setComment}
      />

      <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
        <button
          type="button"
          className="btn small work-stop-inspector__lift"
          disabled={!canAct}
          onClick={() => void onResolve('lift', trimmed)}
        >
          {busy ? 'Сохранение…' : 'Восстановить'}
        </button>
        <button
          type="button"
          className="btn small work-stop-inspector__annul"
          disabled={!canAct}
          onClick={() => {
            if (
              !window.confirm(wsUi.annulConfirm)
            ) {
              return
            }
            void onResolve('annul', trimmed)
          }}
        >
          Аннулировать
        </button>
        <Link className="btn ghost small" to={`/p/${item.permitId}#work-stop-section`}>
          Открыть наряд
        </Link>
      </div>
    </li>
  )
}

export function WorkStopAlertsPanel(props: {
  alerts: WorkStopAlert[]
  pendingPermits?: Permit[]
  dismissedPermitIds?: ReadonlySet<string>
  busy?: boolean
  busyPermitId?: string | null
  onResolve: (permitId: string, action: WorkStopResolveAction, comment: string) => Promise<void>
  onDismiss?: (permitId: string) => void
  title?: string
}) {
  const {
    alerts,
    pendingPermits = [],
    dismissedPermitIds = new Set(),
    busy = false,
    busyPermitId = null,
    onResolve,
    onDismiss,
    title = 'Требует решения — остановка работ',
  } = props

  const permitById = new Map(pendingPermits.map((p) => [p.id, p]))
  const seen = new Set<string>()
  const items: QueueItem[] = []

  for (const alert of alerts) {
    if (dismissedPermitIds.has(alert.permitId)) continue
    seen.add(alert.permitId)
    items.push(alertToQueueItem(alert, permitById.get(alert.permitId)))
  }

  for (const permit of pendingPermits) {
    if (dismissedPermitIds.has(permit.id) || seen.has(permit.id)) continue
    if (permit.workStop?.status !== 'pending') continue
    items.push(toQueueItem(permit))
  }

  items.sort((a, b) => (a.atIso < b.atIso ? 1 : -1))

  if (items.length === 0) return null

  return (
    <section className="rejected-permits-panel work-stop-alerts" role="status">
      <header className="rejected-permits-panel__header">
        <div>
          <h2 className="rejected-permits-panel__title">{title}</h2>
          <p className="rejected-permits-panel__lead">
            {INSPECTOR_ROLE_TITLE}: восстановите работу или аннулируйте наряд. Все наряды доступны
            в журнале.
          </p>
        </div>
      </header>

      <ul className="rejected-permits-panel__list">
        {items.map((item) => (
          <WorkStopAlertItem
            key={item.permitId}
            item={item}
            busy={busy && busyPermitId === item.permitId}
            onResolve={(action, comment) => onResolve(item.permitId, action, comment)}
            onDismiss={() => onDismiss?.(item.permitId)}
          />
        ))}
      </ul>
    </section>
  )
}
