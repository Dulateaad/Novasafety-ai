import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { AdminNotificationEmailsPanel } from '../components/AdminNotificationEmailsPanel'
import { AdminPersonnelTable } from '../components/AdminPersonnelTable'
import { AdminPermitsJournalSection } from '../components/AdminPermitsJournalSection'
import { downloadPermitsCsv } from '../lib/exportPermitsCsv'
import { useSigningSettings } from '../hooks/useSigningSettings'
import { updateSigningSettings } from '../lib/signingSettings'

export function AdminPanelPage() {
  const { t } = useLanguage()
  const ap = t.adminPage
  const adm = t.admin
  const c = t.common
  const panel = t.adminPanel
  const { user, permits, authMode } = useSession()
  const [busy, setBusy] = useState(false)

  const {
    verifyEgovFio,
    loading: signingSettingsLoading,
    setSettings: setSigningSettings,
  } = useSigningSettings()

  const exportCount = useMemo(() => permits.length, [permits])

  if (!user) return null
  if (user.role !== 'coordinator') {
    return <Navigate to="/" replace />
  }

  async function toggleVerifyEgovFio() {
    if (!user) return
    setBusy(true)
    try {
      const next = !verifyEgovFio
      const result = await updateSigningSettings(next, user.id)
      setSigningSettings(result)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.settingsFailed)
    } finally {
      setBusy(false)
    }
  }

  function exportExcel() {
    downloadPermitsCsv(
      permits,
      `journal-nd-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  return (
    <div className="page admin-panel">
      <div className="admin-panel__hero card">
        <div>
          <Link className="small muted" to="/">
            ← {ap.backJournal}
          </Link>
          <h1 className="admin-panel__title">{ap.title}</h1>
          <p className="muted small">{ap.subtitle}</p>
        </div>
        <div className="admin-panel__status">
          <div className="admin-panel__status-card">
            <span className="muted xsmall">{ap.adminLabel}</span>
            <strong>{user.displayName}</strong>
            <span className="admin-panel__badge">{ap.activeBadge}</span>
          </div>
          <button
            type="button"
            className="btn primary"
            disabled={exportCount === 0}
            onClick={exportExcel}
          >
            {ap.exportExcel}
          </button>
        </div>
      </div>

      <AdminPermitsJournalSection />

      <AdminPersonnelTable />

      {authMode === 'firebase' ? (
        <div id="emails">
          <AdminNotificationEmailsPanel />
        </div>
      ) : (
        <section className="card admin-panel__section">
          <p className="muted small">{ap.firebaseOnlyHint}</p>
        </section>
      )}

      <section className="card admin-panel__section" id="egov">
        <h2 className="admin-panel__heading">{panel.titleEgovSign}</h2>
        <p className="muted small">
          {adm.fioVerifyLabel}. {panel.currently}{' '}
          <strong>{verifyEgovFio ? c.enabled : c.disabled}</strong>.
        </p>
        <button
          type="button"
          className="btn ghost"
          disabled={busy || signingSettingsLoading}
          onClick={() => void toggleVerifyEgovFio()}
        >
          {verifyEgovFio ? adm.disableFioVerify : adm.enableFioVerify}
        </button>
      </section>
    </div>
  )
}
