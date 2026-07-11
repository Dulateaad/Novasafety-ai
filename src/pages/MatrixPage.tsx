import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { MobilePermitCard } from '../components/MobilePermitCard'
import type { Permit, PermitStatus } from '../types/domain'
import {
  ZONE_CLASS_LABELS,
  formatSpecialWorkActivitiesLabels,
} from '../types/domain'
import { useLanguage } from '../context/LanguageContext'

function matrixNdStatusGroup(
  status: PermitStatus,
  m: ReturnType<typeof useLanguage>['t']['matrix'],
): string {
  switch (status) {
    case 'draft':
    case 'on_approval':
      return m.pending
    case 'rejected':
      return m.rejected
    case 'issued':
    case 'in_progress':
    case 'suspended':
      return m.open
    case 'closed':
    case 'archived':
      return m.closed
    default:
      return status
  }
}

function matrixStatusClass(status: PermitStatus): string {
  switch (status) {
    case 'draft':
    case 'on_approval':
      return 'matrix-status--pending'
    case 'rejected':
      return 'matrix-status--rejected'
    case 'issued':
    case 'in_progress':
    case 'suspended':
      return 'matrix-status--open'
    default:
      return 'matrix-status--closed'
  }
}

function deadlineForPermit(p: Permit, language: string): string | null {
  const iso = p.validUntilIso ?? p.f04?.validUntilIso
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU')
}

export function MatrixPage() {
  const { permits } = useSession()
  const { t, language } = useLanguage()
  const m = t.matrix
  const c = t.common

  const sorted = [...permits].sort((a, b) =>
    a.updatedAtIso < b.updatedAtIso ? 1 : -1,
  )

  return (
    <div className="page">
      <h1>{m.title}</h1>
      <p className="muted small page-subtitle">{m.subtitle}</p>

      {sorted.length === 0 ? (
        <div className="empty-state card">
          <p className="muted">{m.empty}</p>
        </div>
      ) : (
        <>
          <div className="permit-cards mobile-only">
            {sorted.map((p, idx) => {
              const num = p.registrationRefNo?.trim() || String(idx + 1)
              const deadline = deadlineForPermit(p, language)
              const group = matrixNdStatusGroup(p.status, m)
              return (
                <MobilePermitCard
                  key={p.id}
                  permit={p}
                  badge={`№ ${num}`}
                  footer={
                    <div className="permit-card__footer-row">
                      <span
                        className={`matrix-status-pill ${matrixStatusClass(p.status)}`}
                      >
                        {group}
                      </span>
                      <span className="muted xsmall">
                        {deadline ? `${m.until} ${deadline}` : m.noDeadline}
                      </span>
                    </div>
                  }
                />
              )
            })}
          </div>

          <div className="card table-wrap desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.colNum}</th>
                  <th>{m.colTitle}</th>
                  <th>{m.colLocation}</th>
                  <th>{m.colWorkTypes}</th>
                  <th>{m.colZone}</th>
                  <th>{m.colDeadline}</th>
                  <th>{m.colStatus}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, idx) => {
                  const num = p.registrationRefNo?.trim() || String(idx + 1)
                  const deadline = deadlineForPermit(p, language)
                  return (
                    <tr key={p.id}>
                      <td className="strong">{num}</td>
                      <td>{p.title}</td>
                      <td>{p.siteName}</td>
                      <td className="small">
                        {formatSpecialWorkActivitiesLabels(
                          p.specialWorkActivities,
                          p.specialWorkActivity,
                        )}
                      </td>
                      <td className="small">{ZONE_CLASS_LABELS[p.zoneClass]}</td>
                      <td className="small muted">{deadline ?? '—'}</td>
                      <td>{matrixNdStatusGroup(p.status, m)}</td>
                      <td>
                        <Link className="btn ghost" to={`/p/${p.id}`}>
                          {c.open}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
