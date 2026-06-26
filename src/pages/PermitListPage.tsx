import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate, formatSpecialWorkLabelsLocalized } from '../i18n/getLocale'
import { formatStoredDateTime } from '../lib/datetimeLocal'
import { MobilePermitCard } from '../components/MobilePermitCard'
import { StatusBadge } from '../components/StatusBadge'
import { PermitOnApprovalSummary } from '../components/PermitOnApprovalSummary'
import { SigningInvitesPanel } from '../components/SigningInvitesPanel'
import { RejectedPermitsPanel } from '../components/RejectedPermitsPanel'
import { WorkStopAlertsPanel } from '../components/WorkStopAlertsPanel'
import { WorkStopResolutionNoticesPanel } from '../components/WorkStopResolutionNoticesPanel'
import { AdminNotificationEmailsPanel } from '../components/AdminNotificationEmailsPanel'
import { PermitNoticesPanel } from '../components/PermitNoticesPanel'
import { ErtGasTestTasksPanel } from '../components/ErtGasTestTasksPanel'
import { PermitterPreWorkTasksPanel } from '../components/PermitterPreWorkTasksPanel'
import { usePermitNotices } from '../hooks/usePermitNotices'
import { useDismissedPermitNotices } from '../hooks/useDismissedPermitNotices'
import { useDismissedRejectionNotices } from '../hooks/useDismissedRejectionNotices'
import { useSigningInvites } from '../hooks/useSigningInvites'
import { useWorkStopAlerts } from '../hooks/useWorkStopAlerts'
import { useWorkStopResolutionDismissal } from '../hooks/useWorkStopResolutionDismissal'
import { useInspectorSettings } from '../hooks/useInspectorSettings'
import { useSigningSettings } from '../hooks/useSigningSettings'
import {
  approvalActionHint,
  pendingApprovalsForUser,
} from '../lib/approvalQueue'
import { ertGasTestTasksForUser } from '../lib/ertGasTestHints'
import { permitterPreWorkTasksForUser } from '../lib/permitterPreWorkHints'
import {
  isPermitSigningRejected,
  rejectedPermitsForUser,
  shouldShowRejectionNotice,
} from '../lib/permitRejectionDisplay'
import { workStopResolutionNoticesForUser } from '../lib/workStopResolutionNotices'
import { isInspectorUser } from '../lib/inspectorAccess'
import { updateInspectorNotifyMode } from '../lib/inspectorSettings'
import { updateSigningSettings } from '../lib/signingSettings'
import {
  filterPermitsForUser,
  canUserCreatePermitPackage,
} from '../lib/permitAccess'
import { canUserDeletePermit } from '../lib/permitDelete'
import {
  buildGodModePermitPatch,
  canUseGodMode,
  findLatestPermit,
  godModeSignPermitClient,
} from '../lib/godModeSign'
import {
  cleanupOrphanSigningInvitesClient,
  renumberPermitsClient,
} from '../lib/renumberPermits'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import { notifyPermitNoticesRefresh } from '../lib/refreshPermitNotices'
import { issueStatusPatchIfApprovalsComplete } from '../lib/transitions'
import { INSPECTOR_ROLE_TITLE, ZONE_CLASS_LABELS } from '../types/domain'
import type { Permit, PermitStatus } from '../types/domain'

type JournalFilter =
  | 'all'
  | 'on_approval'
  | 'rejected'
  | 'issued'
  | 'active'
  | 'closed'

const ISSUED_STATUSES = new Set<PermitStatus>(['issued', 'in_progress', 'suspended'])
const CLOSED_STATUSES = new Set<PermitStatus>(['closed', 'archived', 'annulled'])

const JOURNAL_FILTERS: { id: JournalFilter; countKey: JournalFilter }[] = [
  { id: 'all', countKey: 'all' },
  { id: 'on_approval', countKey: 'on_approval' },
  { id: 'rejected', countKey: 'rejected' },
  { id: 'issued', countKey: 'issued' },
  { id: 'active', countKey: 'active' },
  { id: 'closed', countKey: 'closed' },
]

function filterJournalPermits(permits: Permit[], filter: JournalFilter): Permit[] {
  switch (filter) {
    case 'on_approval':
      return permits.filter((p) => p.status === 'on_approval')
    case 'rejected':
      return permits.filter((p) => isPermitSigningRejected(p))
    case 'issued':
      return permits.filter((p) => p.status === 'issued')
    case 'active':
      return permits.filter((p) => ISSUED_STATUSES.has(p.status))
    case 'closed':
      return permits.filter((p) => CLOSED_STATUSES.has(p.status))
    default:
      return permits
  }
}

function journalFilterLabel(
  filter: JournalFilter,
  j: ReturnType<typeof useLanguage>['t']['journal'],
): string {
  switch (filter) {
    case 'on_approval':
      return j.filterOnApproval
    case 'rejected':
      return j.filterRejected
    case 'issued':
      return j.filterIssued
    case 'active':
      return j.filterActive
    case 'closed':
      return j.filterClosed
    default:
      return j.filterAll
  }
}

export function PermitListPage() {
  const { t, language } = useLanguage()
  const j = t.journal
  const ap = t.adminPanel
  const gm = t.godMode
  const adm = t.admin
  const c = t.common
  const approval = t.approval
  const inv = t.invites
  const jt = t.journalTable

  const {
    permits: allPermits,
    user,
    resolveUser,
    authMode,
    deletePermit,
    deleteAllPermits,
    updatePermit,
    refresh,
    userDirectory,
  } = useSession()

  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const permits = useMemo(
    () => filterPermitsForUser(allPermits, user),
    [allPermits, user],
  )
  const visiblePermits = useMemo(
    () => filterJournalPermits(permits, journalFilter),
    [permits, journalFilter],
  )
  const issuedPermits = useMemo(
    () => permits.filter((p) => p.status === 'issued'),
    [permits],
  )

  const filteredPermits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return visiblePermits
    return visiblePermits.filter((p) => {
      const haystack = [
        p.title,
        p.siteName,
        p.registrationRefNo,
        formatSpecialWorkLabelsLocalized(
          p.specialWorkActivities,
          p.specialWorkActivity,
          language,
        ),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [visiblePermits, searchQuery, language])

  const filterCounts = useMemo(() => {
    const counts = {} as Record<JournalFilter, number>
    for (const item of JOURNAL_FILTERS) {
      counts[item.countKey] = filterJournalPermits(permits, item.id).length
    }
    return counts
  }, [permits])

  const pending = user ? pendingApprovalsForUser(permits, user) : []
  const signingInvites = useSigningInvites(user?.id)
  const pendingWithoutInviteDup = pending.filter((item) => {
    if (item.action === 'issue_permit') return true
    return !signingInvites.some((invItem) => invItem.permitId === item.permit.id)
  })

  const { dismissed: dismissedRejections, dismiss: dismissRejection } =
    useDismissedRejectionNotices(user?.id)
  const { dismissed: dismissedWorkStopResolutions, dismiss: dismissWorkStopResolution } =
    useWorkStopResolutionDismissal(user?.id)
  const rejectedPermits = user
    ? rejectedPermitsForUser(permits, user, dismissedRejections)
    : []
  const workStopResolutionNotices = useMemo(
    () => workStopResolutionNoticesForUser(permits, user?.id, dismissedWorkStopResolutions),
    [permits, user?.id, dismissedWorkStopResolutions],
  )

  const workStopAlerts = useWorkStopAlerts(
    user && isInspectorUser(user) ? user.id : undefined,
  )
  const allPermitNotices = usePermitNotices(user?.id)
  const { dismissed: dismissedNotices, dismiss: dismissNotice } =
    useDismissedPermitNotices(user?.id)
  const permitNotices = useMemo(
    () => allPermitNotices.filter((n) => !dismissedNotices.has(n.id)),
    [allPermitNotices, dismissedNotices],
  )
  const ertGasTasks = useMemo(
    () => ertGasTestTasksForUser(permits, user),
    [permits, user],
  )
  const permitterPreWorkTasks = useMemo(
    () => permitterPreWorkTasksForUser(permits, user),
    [permits, user],
  )

  const {
    settings: inspectorSettings,
    loading: inspectorSettingsLoading,
    setSettings: setInspectorSettings,
  } = useInspectorSettings()

  const {
    verifyEgovFio,
    loading: signingSettingsLoading,
    setSettings: setSigningSettings,
  } = useSigningSettings()

  const canCreate = canUserCreatePermitPackage(user)
  const canDeleteAll = user ? canUserDeletePermit(user) : false
  const canRenumber = user?.role === 'coordinator' && allPermits.length > 0
  const canCleanupInvites = user?.role === 'coordinator' && authMode === 'firebase'
  const canManageSigningSettings =
    user?.role === 'coordinator' && authMode === 'firebase'
  const canManageInspectorSettings =
    user?.role === 'coordinator' && authMode === 'firebase'
  const showGodMode = canUseGodMode(user)

  const godModeTarget = useMemo(() => {
    const candidates = allPermits.filter((p) => p.status === 'on_approval')
    return findLatestPermit(candidates)
  }, [allPermits])

  const permitCreatedAtIso = (permitId: string) =>
    allPermits.find((p) => p.id === permitId)?.createdAtIso

  const latestPermit = useMemo(() => findLatestPermit(allPermits), [allPermits])
  const canGodMode =
    canUseGodMode(user) &&
    latestPermit?.status === 'on_approval'

  async function runGodModeOnLatest() {
    if (!canGodMode || !latestPermit) return
    const label = latestPermit.registrationRefNo || latestPermit.title || latestPermit.id
    if (
      !window.confirm(
        fillTemplate(gm.confirm, { label }),
      )
    ) {
      return
    }
    setBusy(true)
    try {
      if (authMode === 'firebase') {
        const result = await godModeSignPermitClient(latestPermit.id)
        if (!result) throw new Error(t.alerts.firebaseFunctionsUnavailable)
        await refresh()
        notifySigningInvitesRefresh()
        notifyPermitNoticesRefresh()
        window.alert(
          fillTemplate(gm.done, {
            crewSigned: result.crewSigned,
            approversSigned: result.approversSigned,
            skippedErt: result.skippedErt,
          }),
        )
      } else {
        const { patch, summary } = buildGodModePermitPatch(
          latestPermit,
          resolveUser,
          userDirectory,
        )
        await updatePermit(latestPermit.id, patch)
        await refresh()
        void import('../lib/permitNotices').then((m) => {
          m.upsertLocalPermitNotices({ ...latestPermit, ...patch }, 'issued')
          notifyPermitNoticesRefresh()
        })
        window.alert(
          fillTemplate(gm.doneDemo, {
            crewSigned: summary.crewSigned,
            approversSigned: summary.approversSigned,
          }),
        )
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : gm.failed)
    } finally {
      setBusy(false)
    }
  }

  async function toggleInspectorNotifyMode() {
    if (!canManageInspectorSettings || inspectorSettingsLoading) return
    setBusy(true)
    try {
      const next =
        inspectorSettings.inspectorNotifyMode === 'global' ? 'site_bound' : 'global'
      const result = await updateInspectorNotifyMode(next)
      if (!result) throw new Error(t.alerts.firebaseFunctionsUnavailable)
      setInspectorSettings(result)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.settingsFailed)
    } finally {
      setBusy(false)
    }
  }

  async function toggleVerifyEgovFio() {
    if (!canManageSigningSettings || signingSettingsLoading) return
    setBusy(true)
    try {
      const next = !verifyEgovFio
      const result = await updateSigningSettings(next)
      if (!result) throw new Error(t.alerts.firebaseFunctionsUnavailable)
      setSigningSettings(result)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.settingsFailed)
    } finally {
      setBusy(false)
    }
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

  async function renumberAll() {
    if (!canRenumber || busy) return
    setBusy(true)
    try {
      const result = await renumberPermitsClient()
      if (!result) throw new Error(t.alerts.firebaseFunctionsUnavailable)
      window.alert(
        fillTemplate(t.alerts.renumberDone, {
          updated: result.updated,
          total: result.total,
          invites: result.invitesUpdated,
        }),
      )
      await refresh()
      notifySigningInvitesRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.renumberFailed)
    } finally {
      setBusy(false)
    }
  }

  async function removeAllPermits() {
    if (!canDeleteAll || busy || allPermits.length === 0) return
    if (
      !window.confirm(
        fillTemplate(t.confirm.deleteAllPermits, { count: allPermits.length }),
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteAllPermits()
      notifySigningInvitesRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.deleteFailed)
    } finally {
      setBusy(false)
    }
  }

  async function removePermitFromJournal(permit: Permit) {
    if (!canDeleteAll) return
    const label = permit.registrationRefNo || permit.title
    if (!window.confirm(fillTemplate(t.confirm.deletePermit, { label }))) return
    setDeletingId(permit.id)
    try {
      await deletePermit(permit.id)
      notifySigningInvitesRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.deleteFailed)
    } finally {
      setDeletingId(null)
    }
  }

  async function runGodModeSign() {
    if (!showGodMode || !godModeTarget) return
    const label = godModeTarget.registrationRefNo || godModeTarget.title
    if (!window.confirm(fillTemplate(gm.confirm, { label }))) return
    setBusy(true)
    try {
      if (authMode === 'firebase') {
        const summary = await godModeSignPermitClient(godModeTarget.id)
        if (!summary) throw new Error(gm.failed)
        window.alert(
          fillTemplate(gm.done, {
            crewSigned: summary.crewSigned,
            approversSigned: summary.approversSigned,
            skippedErt: summary.skippedErt,
          }),
        )
        await refresh()
      } else {
        const { patch, summary } = buildGodModePermitPatch(
          godModeTarget,
          resolveUser,
          userDirectory,
        )
        const merged = { ...godModeTarget, ...patch }
        await updatePermit(godModeTarget.id, {
          ...patch,
          ...issueStatusPatchIfApprovalsComplete(merged),
        })
        window.alert(
          fillTemplate(gm.doneDemo, {
            crewSigned: summary.crewSigned,
            approversSigned: summary.approversSigned,
          }),
        )
      }
      notifySigningInvitesRefresh()
    } catch {
      window.alert(gm.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="journal-hero card">
        <div className="journal-hero__content">
          <h1 className="journal-hero__title">{j.title}</h1>
          <p className="muted small journal-hero__subtitle">{j.subtitle}</p>
          {canCreate ? (
            <Link className="btn primary journal-hero__cta" to="/ppr?fresh=1">
              + {j.createPermit}
            </Link>
          ) : null}
        </div>
      </div>

      {canDeleteAll || canRenumber || canCleanupInvites ? (
        <div className="btn-row journal-admin-actions" style={{ marginBottom: '1rem' }}>
          {canDeleteAll && allPermits.length > 0 ? (
            <button
              type="button"
              className="btn ghost danger"
              disabled={busy}
              onClick={() => void removeAllPermits()}
            >
              {busy ? j.deleting : j.deleteAll}
            </button>
          ) : null}
          {canRenumber ? (
            <button
              type="button"
              className="btn ghost"
              disabled={busy}
              onClick={() => void renumberAll()}
            >
              {busy ? j.renumbering : j.renumber}
            </button>
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
      ) : null}

      {user?.role === 'coordinator' ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 className="small" style={{ marginTop: 0 }}>
            {fillTemplate(ap.titleInspector, { role: INSPECTOR_ROLE_TITLE })}
          </h2>
          <p className="muted small">
            {ap.workStopNotifications}{' '}
            <strong>
              {inspectorSettings.inspectorNotifyMode === 'global'
                ? adm.inspectorScopeAll
                : adm.inspectorScopeZone}
            </strong>
          </p>
          <button
            type="button"
            className="btn ghost"
            disabled={busy || inspectorSettingsLoading}
            onClick={() => void toggleInspectorNotifyMode()}
          >
            {inspectorSettings.inspectorNotifyMode === 'global'
              ? adm.enableZoneScope
              : adm.enableGlobalScope}
          </button>
        </section>
      ) : null}

      {canUseGodMode(user) ? (
        <section
          className="card"
          style={{ marginBottom: '1rem', borderColor: '#7c3aed' }}
        >
          <h2 className="small" style={{ marginTop: 0 }}>
            {gm.title}
          </h2>
          <p className="muted small" style={{ marginBottom: '0.75rem' }}>
            {gm.descriptionIntro}{' '}
            <strong>{gm.descriptionWorkers}</strong> {gm.descriptionAck}{' '}
            <strong>{gm.descriptionApprovers}</strong> {gm.descriptionApproversList}{' '}
            {gm.descriptionExcluded}
          </p>
          {latestPermit ? (
            <p className="small" style={{ marginBottom: '0.75rem' }}>
              {gm.latestPermit}{' '}
              <Link to={`/permits/${latestPermit.id}`}>
                {latestPermit.registrationRefNo || latestPermit.title || '—'}
              </Link>{' '}
              · <StatusBadge status={latestPermit.status} />
            </p>
          ) : (
            <p className="muted small">{gm.noPermits}</p>
          )}
          <button
            type="button"
            className="btn primary small"
            disabled={busy || !canGodMode}
            onClick={() => void runGodModeOnLatest()}
            title={canGodMode ? undefined : t.admin.godModeNeedPermit}
          >
            {busy ? gm.busy : gm.signLatest}
          </button>
        </section>
      ) : null}

      {canManageSigningSettings ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 className="small" style={{ marginTop: 0 }}>
            {ap.titleEgovSign}
          </h2>
          <p className="muted small" style={{ marginBottom: '0.75rem' }}>
            {adm.fioVerifyLabel}. {ap.currently}{' '}
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
      ) : null}

      {canManageSigningSettings ? <AdminNotificationEmailsPanel /> : null}

      {showGodMode ? (
        <section className="card god-mode-card" style={{ marginBottom: '1rem' }}>
          <h2 className="small" style={{ marginTop: 0 }}>
            {gm.title}
          </h2>
          <p className="muted small">
            {gm.descriptionIntro} {gm.descriptionWorkers} {gm.descriptionAck}{' '}
            {gm.descriptionApprovers} {gm.descriptionApproversList}{' '}
            {gm.descriptionExcluded}
          </p>
          <p className="small">
            {gm.latestPermit}{' '}
            <strong>
              {godModeTarget
                ? godModeTarget.registrationRefNo || godModeTarget.title
                : gm.noPermits}
            </strong>
          </p>
          <button
            type="button"
            className="btn ghost"
            disabled={busy || !godModeTarget}
            onClick={() => void runGodModeSign()}
          >
            {busy ? gm.busy : gm.signLatest}
          </button>
        </section>
      ) : null}

      <RejectedPermitsPanel
        permits={rejectedPermits}
        resolveUser={resolveUser}
        onDismiss={dismissRejection}
      />

      <RejectedPermitsPanel
        permits={rejectedPermits}
        resolveUser={resolveUser}
        onDismiss={dismissRejection}
      />

      <SigningInvitesPanel
        invites={signingInvites}
        permitCreatedAtIso={permitCreatedAtIso}
        title={user?.role === 'executor' ? inv.ackTitle : inv.signTitle}
      />

      <PermitNoticesPanel notices={permitNotices} onDismiss={dismissNotice} />

      <ErtGasTestTasksPanel tasks={ertGasTasks} />

      <PermitterPreWorkTasksPanel tasks={permitterPreWorkTasks} />

      <WorkStopResolutionNoticesPanel
        permits={workStopResolutionNotices}
        onDismiss={dismissWorkStopResolution}
      />

      {isInspectorUser(user) ? <WorkStopAlertsPanel alerts={workStopAlerts} /> : null}

      {pendingWithoutInviteDup.length > 0 ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>{approval.pendingTitle}</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {approval.pendingHint}
          </p>
          <ul className="compact-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pendingWithoutInviteDup.map((item) => (
              <li
                key={`${item.permit.id}-${item.action}`}
                className="card"
                style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
              >
                <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <StatusBadge status={item.permit.status} />
                  <span className="strong">{item.permit.title}</span>
                  <span className="small muted">
                    № {item.permit.registrationRefNo || '—'}
                  </span>
                  <span className="small muted">
                    · {c.created} {formatStoredDateTime(item.permit.createdAtIso)}
                  </span>
                </div>
                <p className="small" style={{ margin: '0.5rem 0 0.35rem' }}>
                  {item.label}
                </p>
                <p className="muted xsmall" style={{ margin: '0 0 0.65rem' }}>
                  {approvalActionHint(item.action)}
                </p>
                <PermitOnApprovalSummary
                  permit={item.permit}
                  resolveUser={resolveUser}
                  variant="inline"
                />
                <Link className="btn primary small" to={`/p/${item.permit.id}`} style={{ marginTop: '0.65rem' }}>
                  {approval.openAndApprove}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {permits.length > 0 ? (
        <>
          <div className="journal-toolbar">
            <input
              type="search"
              className="journal-search"
              placeholder={j.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={j.searchPlaceholder}
            />
            <div className="journal-filters" role="tablist" aria-label={j.filtersBtn}>
              {JOURNAL_FILTERS.map(({ id }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={journalFilter === id}
                  className={`journal-filter${journalFilter === id ? ' journal-filter--active' : ''}`}
                  onClick={() => setJournalFilter(id)}
                >
                  {journalFilterLabel(id, j)} ({filterCounts[id]})
                </button>
              ))}
            </div>
          </div>

          {issuedPermits.length > 0 &&
          journalFilter !== 'issued' &&
          journalFilter !== 'active' ? (
            <p className="muted small journal-issued-hint">{j.issuedHint}</p>
          ) : null}
        </>
      ) : null}

      {permits.length === 0 ? (
        <div className="empty-state card">
          <p className="strong">{j.emptyTitle}</p>
          <p className="muted small">
            {canCreate ? j.emptyHintCreate : j.emptyHintWait}
          </p>
          {canCreate ? (
            <Link className="btn primary" to="/ppr?fresh=1">
              {j.createPermit}
            </Link>
          ) : null}
        </div>
      ) : visiblePermits.length === 0 ? (
        <div className="empty-state card">
          <p className="strong">{j.emptyFilterTitle}</p>
          <p className="muted small">
            {journalFilter === 'issued' ? j.emptyFilterIssued : j.emptyFilterOther}
          </p>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setJournalFilter('all')}
          >
            {j.filterAll} ({permits.length})
          </button>
        </div>
      ) : filteredPermits.length === 0 ? (
        <div className="empty-state card">
          <p className="strong">{j.emptyFilterTitle}</p>
          <p className="muted small">{j.searchPlaceholder}</p>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setSearchQuery('')}
          >
            {j.filterAll}
          </button>
        </div>
      ) : (
        <>
          <div className="permit-cards mobile-only">
            {filteredPermits.map((p) => (
              <MobilePermitCard
                key={p.id}
                permit={p}
                showRejectionStrip={
                  user ? shouldShowRejectionNotice(p, user, dismissedRejections) : true
                }
                onDelete={canDeleteAll ? () => void removePermitFromJournal(p) : undefined}
                deleteDisabled={deletingId === p.id}
              />
            ))}
          </div>

          <div className="card table-wrap desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{jt.siteTopic}</th>
                  <th>{jt.regNo}</th>
                  <th>{jt.workTypes}</th>
                  <th>{jt.zone}</th>
                  <th>{jt.status}</th>
                  <th>{jt.updated}</th>
                  {canDeleteAll ? <th>{jt.admin}</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredPermits.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="strong">{p.title}</div>
                      <div className="small muted">{p.siteName}</div>
                    </td>
                    <td className="small muted">{p.registrationRefNo || '—'}</td>
                    <td>
                      {formatSpecialWorkLabelsLocalized(
                        p.specialWorkActivities,
                        p.specialWorkActivity,
                        language,
                      )}
                    </td>
                    <td>{ZONE_CLASS_LABELS[p.zoneClass]}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="small muted">
                      {new Date(p.updatedAtIso).toLocaleString(
                        language === 'en' ? 'en-GB' : 'ru-RU',
                      )}
                    </td>
                    {canDeleteAll ? (
                      <td>
                        <button
                          type="button"
                          className="btn ghost small danger"
                          disabled={deletingId === p.id}
                          onClick={() => void removePermitFromJournal(p)}
                        >
                          {deletingId === p.id ? c.deleting : c.delete}
                        </button>
                      </td>
                    ) : null}
                    <td>
                      <Link className="btn ghost" to={`/p/${p.id}`}>
                        {c.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
