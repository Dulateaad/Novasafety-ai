import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import type { DemoUser, UserRole } from '../types/domain'
import { db, firebaseConfigured } from '../lib/firebase'
import { profileDocToDemoUser } from '../lib/userProfile'
import {
  isNotificationEmailValid,
  saveNotificationEmail,
} from '../lib/notificationEmail'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { fillTemplate, roleLabel } from '../i18n/getLocale'

const ROLE_ORDER: UserRole[] = [
  'coordinator',
  'issuer',
  'permitter',
  'performer',
  'leadExpert',
  'ert',
  'safety',
  'contractor',
  'executor',
]

type EmailRow = DemoUser & {
  draftEmail: string
}

function roleRank(role: UserRole): number {
  const idx = ROLE_ORDER.indexOf(role)
  return idx === -1 ? ROLE_ORDER.length : idx
}

export function AdminNotificationEmailsPanel() {
  const { t, language } = useLanguage()
  const ne = t.notificationEmail
  const { showError, showInfo } = useToast()
  const [rows, setRows] = useState<EmailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUid, setSavingUid] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    if (!firebaseConfigured || !db) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const next: EmailRow[] = []
      snap.forEach((d) => {
        const user = profileDocToDemoUser(
          d.id,
          d.data() as Record<string, unknown>,
          String((d.data() as { email?: string }).email ?? ''),
        )
        const notify = user.notificationEmail ?? ''
        next.push({ ...user, draftEmail: notify })
      })
      next.sort((a, b) => {
        const byRole = roleRank(a.role) - roleRank(b.role)
        if (byRole !== 0) return byRole
        return a.displayName.localeCompare(b.displayName, 'ru')
      })
      setRows(next)
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const approverRows = useMemo(
    () => rows.filter((r) => r.role !== 'executor'),
    [rows],
  )
  const executorRows = useMemo(
    () => rows.filter((r) => r.role === 'executor'),
    [rows],
  )

  function setDraft(uid: string, draftEmail: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === uid ? { ...r, draftEmail } : r)),
    )
  }

  async function saveRow(row: EmailRow) {
    if (!isNotificationEmailValid(row.draftEmail)) {
      showError(ne.invalid)
      return
    }
    setSavingUid(row.id)
    try {
      await saveNotificationEmail(row.id, row.draftEmail)
      const trimmed = row.draftEmail.trim()
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, notificationEmail: trimmed || undefined, draftEmail: trimmed }
            : r,
        ),
      )
      showInfo(
        trimmed
          ? fillTemplate(ne.adminSavedFor, { name: row.displayName })
          : ne.cleared,
      )
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingUid(null)
    }
  }

  function renderTable(items: EmailRow[], readOnly = false) {
    if (items.length === 0) return null
    return (
      <div className="admin-notification-emails__table-wrap">
        <table className="admin-notification-emails__table">
          <thead>
            <tr>
              <th>{ne.adminColName}</th>
              <th>{ne.adminColRole}</th>
              <th>{ne.adminColLogin}</th>
              <th>{ne.adminColNotify}</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const busy = savingUid === row.id
              return (
                <tr key={row.id}>
                  <td>{row.displayName}</td>
                  <td className="muted small">{roleLabel(row.role, language)}</td>
                  <td className="muted small">{row.email}</td>
                  <td>
                    {readOnly ? (
                      <span className="muted xsmall">{ne.adminExecutorNote}</span>
                    ) : (
                      <input
                        type="email"
                        className="admin-notification-emails__input"
                        value={row.draftEmail}
                        placeholder={ne.placeholder}
                        autoComplete="email"
                        disabled={busy}
                        onChange={(e) => setDraft(row.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRow(row)
                        }}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? null : (
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={busy}
                        onClick={() => void saveRow(row)}
                      >
                        {busy ? ne.saving : ne.save}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="card admin-notification-emails" style={{ marginBottom: '1rem' }}>
      <h2 className="small" style={{ marginTop: 0 }}>
        {ne.adminTitle}
      </h2>
      <p className="muted small" style={{ marginBottom: '0.75rem' }}>
        {ne.adminHint}
      </p>
      {loading ? (
        <p className="muted small">{t.common.loading ?? '…'}</p>
      ) : (
        <>
          {renderTable(approverRows)}
          {renderTable(executorRows, true)}
        </>
      )}
    </section>
  )
}
