import { useMemo, useState } from 'react'
import { useSession } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { StatusBadge } from './StatusBadge'
import { fillTemplate, formatSpecialWorkLabelsLocalized } from '../i18n/getLocale'
import { canUserDeletePermit } from '../lib/permitDelete'
import { cleanupOrphanSigningInvitesClient } from '../lib/renumberPermits'
import { notifyPermitNoticesRefresh } from '../lib/refreshPermitNotices'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'

export function AdminPermitsJournalSection() {
  const { t, language } = useLanguage()
  const ap = t.adminPage
  const j = t.journal
  const jt = t.journalTable
  const c = t.common
  const { user, permits, authMode, deletePermit } = useSession()
  const [busy, setBusy] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const canDelete = user ? canUserDeletePermit(user) : false
  const canCleanupInvites = user?.role === 'coordinator' && authMode === 'firebase'

  const sortedPermits = useMemo(
    () =>
      [...permits].sort(
        (a, b) =>
          new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime(),
      ),
    [permits],
  )

  const deletablePermits = useMemo(
    () => (user ? sortedPermits.filter((p) => canUserDeletePermit(user, p)) : []),
    [sortedPermits, user],
  )
  const selectedCount = selectedIds.size
  const allSelected =
    deletablePermits.length > 0 && deletablePermits.every((p) => selectedIds.has(p.id))
  const someSelected = selectedCount > 0 && !allSelected

  function toggleOne(id: string) {
    const permit = sortedPermits.find((p) => p.id === id)
    if (permit && !canUserDeletePermit(user!, permit)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const deletable = sortedPermits.filter((p) => canUserDeletePermit(user!, p))
    if (deletable.length > 0 && deletable.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(deletable.map((p) => p.id)))
  }

  async function cleanupStaleInvites() {
    if (!canCleanupInvites || busy) return
    setBusy(true)
    try {
      const result = await cleanupOrphanSigningInvitesClient()
      if (!result) throw new Error(t.alerts.firebaseFunctionsUnavailable)
      window.alert(
        fillTemplate(t.alerts.invitesCleaned, {
          deleted: result.deleted,
          scanned: result.scanned,
        }),
      )
      notifySigningInvitesRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.invitesCleanFailed)
    } finally {
      setBusy(false)
    }
  }

  async function removeSelected() {
    if (!canDelete || busy || selectedCount === 0) return
    if (
      !window.confirm(
        fillTemplate(ap.deleteSelectedConfirm, { count: String(selectedCount) }),
      )
    ) {
      return
    }
    setBusy(true)
    const ids = [...selectedIds]
    try {
      for (const id of ids) {
        await deletePermit(id)
      }
      setSelectedIds(new Set())
      notifySigningInvitesRefresh()
      notifyPermitNoticesRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.deleteFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card admin-panel__section">
      <h2 className="admin-panel__heading">{ap.journalTitle}</h2>
      <p className="muted small">
        {fillTemplate(ap.journalHint, { count: String(permits.length) })}
      </p>

      <div className="btn-row admin-panel__journal-toolbar">
        {canDelete && selectedCount > 0 ? (
          <button
            type="button"
            className="btn ghost danger"
            disabled={busy}
            onClick={() => void removeSelected()}
          >
            {busy ? c.deleting : ap.deleteSelected}
          </button>
        ) : null}
        {canDelete && selectedCount > 0 ? (
          <span className="muted small">
            {fillTemplate(ap.selectedCount, { count: String(selectedCount) })}
          </span>
        ) : null}
        {canCleanupInvites ? (
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => void cleanupStaleInvites()}
          >
            {busy ? j.cleaning : j.cleanupInvites}
          </button>
        ) : null}
      </div>

      {sortedPermits.length === 0 ? (
        <p className="muted small admin-panel__journal-empty">{ap.journalEmpty}</p>
      ) : (
        <div className="table-wrap admin-panel__journal-table">
          <table className="data-table">
            <thead>
              <tr>
                {canDelete ? (
                  <th className="admin-panel__select-col">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected
                      }}
                      aria-label={ap.selectAllLabel}
                      disabled={busy}
                      onChange={toggleAll}
                    />
                  </th>
                ) : null}
                <th>{jt.regNo}</th>
                <th>{jt.siteTopic}</th>
                <th>{jt.workTypes}</th>
                <th>{jt.status}</th>
                <th>{jt.updated}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPermits.map((p) => (
                <tr key={p.id}>
                  {canDelete ? (
                    <td className="admin-panel__select-col">
                      {canUserDeletePermit(user!, p) ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          aria-label={p.registrationRefNo || p.title || p.id}
                          disabled={busy}
                          onChange={() => toggleOne(p.id)}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="small muted">{p.registrationRefNo || '—'}</td>
                  <td>
                    <div className="strong">{p.title || c.untitled}</div>
                    <div className="small muted">{p.siteName || '—'}</div>
                  </td>
                  <td>
                    {formatSpecialWorkLabelsLocalized(
                      p.specialWorkActivities,
                      p.specialWorkActivity,
                      language,
                    )}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="small muted">
                    {new Date(p.updatedAtIso).toLocaleString(
                      language === 'en' ? 'en-GB' : 'ru-RU',
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
