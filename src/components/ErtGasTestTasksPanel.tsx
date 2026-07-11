import { Link } from 'react-router-dom'
import type { ErtGasTestTask } from '../lib/ertGasTestHints'
import { formatStoredDateTime } from '../lib/datetimeLocal'
import { useLanguage } from '../context/LanguageContext'

export function ErtGasTestTasksPanel(props: { tasks: ErtGasTestTask[] }) {
  const { tasks } = props
  const { t } = useLanguage()
  if (tasks.length === 0) return null

  return (
    <section className="card alert" role="status" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>{t.ert.panelTitle}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {t.ert.panelHint}
      </p>
      <ul className="compact-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {tasks.map(({ permit, summary, needsFill }) => (
          <li
            key={permit.id}
            className="card"
            style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
          >
            <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <span
                className="small"
                style={{ fontWeight: 600, color: needsFill ? '#0b2147' : '#666' }}
              >
                {needsFill ? t.ert.needsReading : '○ Gas test'}
              </span>
              <span className="strong">{permit.title || permit.workDescription || '—'}</span>
              <span className="small muted">№ {permit.registrationRefNo || '—'}</span>
              <span className="small muted">
                · {formatStoredDateTime(permit.updatedAtIso ?? permit.createdAtIso)}
              </span>
            </div>
            <p className="small" style={{ margin: '0.5rem 0 0.65rem' }}>
              {summary}
            </p>
            <Link className="btn primary small" to={`/p/${permit.id}`}>
              {t.ert.openGasTest}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
