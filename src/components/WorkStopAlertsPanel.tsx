import { Link } from 'react-router-dom'
import type { Permit } from '../types/domain'
import type { WorkStopAlert } from '../types/workStop'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import { formatStoredDateTime } from '../lib/datetimeLocal'

export function WorkStopAlertsPanel(props: {
  alerts: WorkStopAlert[]
  pendingPermits?: Permit[]
  title?: string
}) {
  const { alerts, pendingPermits = [], title = 'Требует решения — остановка работ' } = props

  const alertPermitIds = new Set(alerts.map((a) => a.permitId))
  const extraPermits = pendingPermits.filter((p) => !alertPermitIds.has(p.id))

  if (alerts.length === 0 && extraPermits.length === 0) return null

  return (
    <section className="card alert work-stop-alerts" role="status" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {INSPECTOR_ROLE_TITLE}: восстановите работу или аннулируйте наряд с комментарием на
        карточке наряда.
      </p>
      <ul className="compact-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="card"
            style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
          >
            <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="small" style={{ fontWeight: 600, color: '#b45309' }}>
                ● Требует решения
              </span>
              <span className="strong">{alert.permitTitle}</span>
              {alert.siteName ? (
                <span className="small muted">· {alert.siteName}</span>
              ) : null}
              <span className="small muted">
                · {formatStoredDateTime(alert.atIso)}
              </span>
            </div>
            <p className="small" style={{ margin: '0.5rem 0 0.35rem' }}>
              Причина: {alert.reason}
            </p>
            <p className="muted xsmall" style={{ margin: '0 0 0.5rem' }}>
              Инициатор: {alert.initiatedByName}
            </p>
            <Link className="btn primary small" to={`/p/${alert.permitId}#work-stop-section`}>
              Восстановить или аннулировать
            </Link>
          </li>
        ))}
        {extraPermits.map((permit) => {
          const ws = permit.workStop!
          return (
            <li
              key={permit.id}
              className="card"
              style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
            >
              <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="small" style={{ fontWeight: 600, color: '#b45309' }}>
                  ● Требует решения
                </span>
                <span className="strong">{permit.title}</span>
                {permit.siteName ? (
                  <span className="small muted">· {permit.siteName}</span>
                ) : null}
                <span className="small muted">· {formatStoredDateTime(ws.atIso)}</span>
              </div>
              <p className="small" style={{ margin: '0.5rem 0 0.35rem' }}>
                Причина: {ws.reason}
              </p>
              <p className="muted xsmall" style={{ margin: '0 0 0.5rem' }}>
                Инициатор: {ws.initiatedByName}
              </p>
              <Link className="btn primary small" to={`/p/${permit.id}#work-stop-section`}>
                Восстановить или аннулировать
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
