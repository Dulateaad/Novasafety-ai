import { Link } from 'react-router-dom'
import type { WorkStopAlert } from '../types/workStop'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import { formatStoredDateTime } from '../lib/datetimeLocal'

export function WorkStopAlertsPanel(props: {
  alerts: WorkStopAlert[]
  title?: string
}) {
  const { alerts, title = 'Требует решения — остановка работ' } = props
  if (alerts.length === 0) return null

  return (
    <section className="card alert work-stop-alerts" role="status" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Уведомление для {INSPECTOR_ROLE_TITLE}. Эскалации нет — решение принимает инспектор:
        аннулировать НДПР или снять остановку и вернуть наряд в работу.
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
              Открыть и принять решение
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
