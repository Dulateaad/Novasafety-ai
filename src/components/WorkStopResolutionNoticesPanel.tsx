import { Link } from 'react-router-dom'
import type { Permit } from '../types/domain'
import { INSPECTOR_ROLE_TITLE } from '../types/domain'
import { formatStoredDateTime } from '../lib/datetimeLocal'

type Props = {
  permits: readonly Permit[]
  onDismiss: (permit: Permit) => void
}

export function WorkStopResolutionNoticesPanel({ permits, onDismiss }: Props) {
  if (permits.length === 0) return null

  return (
    <section className="work-stop-resolution-panel" role="status">
      <header className="work-stop-resolution-panel__header">
        <div>
          <h2 className="work-stop-resolution-panel__title">Уведомления</h2>
          <p className="work-stop-resolution-panel__lead muted small">
            Решение инспектора по остановке работ на объекте.
          </p>
        </div>
      </header>

      <ul className="work-stop-resolution-panel__list">
        {permits.map((permit) => {
          const ws = permit.workStop!
          const lifted = ws.status === 'lifted'
          return (
            <li key={permit.id} className="work-stop-resolution-panel__item">
              <div className="work-stop-resolution-panel__item-head">
                <div className="work-stop-resolution-panel__item-meta">
                  <span
                    className={`work-stop-resolution-panel__badge ${
                      lifted
                        ? 'work-stop-resolution-panel__badge--lifted'
                        : 'work-stop-resolution-panel__badge--annulled'
                    }`}
                  >
                    {lifted ? 'Остановка снята' : 'Наряд аннулирован'}
                  </span>
                  <span className="strong">{permit.title}</span>
                  {permit.siteName ? (
                    <span className="small muted">· {permit.siteName}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="work-stop-resolution-panel__dismiss"
                  aria-label="Закрыть уведомление"
                  onClick={() => onDismiss(permit)}
                >
                  ✕
                </button>
              </div>

              {ws.inspectorComment ? (
                <p className="work-stop-resolution-panel__comment">{ws.inspectorComment}</p>
              ) : null}

              <p className="work-stop-resolution-panel__meta muted xsmall">
                {ws.resolvedByName ?? INSPECTOR_ROLE_TITLE}
                {ws.resolvedAtIso ? ` · ${formatStoredDateTime(ws.resolvedAtIso)}` : ''}
              </p>

              <Link className="btn ghost small" to={`/p/${permit.id}`}>
                Открыть наряд
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
