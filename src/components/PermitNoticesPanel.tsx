import { Link } from 'react-router-dom'
import type { PermitNotice } from '../types/permitNotice'
import { formatStoredDateTime } from '../lib/datetimeLocal'

export function PermitNoticesPanel(props: {
  notices: PermitNotice[]
  onDismiss: (notice: PermitNotice) => void
}) {
  const { notices, onDismiss } = props
  if (notices.length === 0) return null

  return (
    <section className="card" role="status" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Уведомления по нарядам</h2>
      <ul className="compact-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {notices.map((notice) => (
          <li
            key={notice.id}
            className="card"
            style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
          >
            <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="strong">{notice.title}</span>
              <span className="small muted">{notice.permitTitle}</span>
              <span className="small muted">№ {notice.registrationRefNo || '—'}</span>
              <span className="small muted">
                · {formatStoredDateTime(notice.updatedAtIso ?? notice.createdAtIso)}
              </span>
            </div>
            <p className="small" style={{ margin: '0.5rem 0 0.65rem' }}>
              {notice.message}
            </p>
            <div className="btn-row">
              <Link className="btn primary small" to={`/p/${notice.permitId}`}>
                Открыть наряд
              </Link>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => onDismiss(notice)}
              >
                Скрыть
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
