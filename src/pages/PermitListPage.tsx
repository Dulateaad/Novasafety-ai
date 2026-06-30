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
import { InspectorRejectedPermitsPanel } from '../components/InspectorRejectedPermitsPanel'
import { WorkStopResolutionNoticesPanel } from '../components/WorkStopResolutionNoticesPanel'
import { PermitNoticesPanel } from '../components/PermitNoticesPanel'
import { ErtGasTestTasksPanel } from '../components/ErtGasTestTasksPanel'
import { PermitterPreWorkTasksPanel } from '../components/PermitterPreWorkTasksPanel'
import { usePermitNotices } from '../hooks/usePermitNotices'
import { useDismissedPermitNotices } from '../hooks/useDismissedPermitNotices'
import { useDismissedRejectionNotices } from '../hooks/useDismissedRejectionNotices'
import { useSigningInvites } from '../hooks/useSigningInvites'
import { useWorkStopAlerts } from '../hooks/useWorkStopAlerts'
import { useWorkStopResolutionDismissal } from '../hooks/useWorkStopResolutionDismissal'
import { useDismissedWorkStopPendingAlerts } from '../hooks/useDismissedWorkStopPendingAlerts'
import { notifyWorkStopAlertsRefresh } from '../lib/refreshWorkStopAlerts'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import {
  approvalActionHint,
  pendingApprovalsForUser,
} from '../lib/approvalQueue'
import { pendingAbrDailyAckPermitsForUser } from '../lib/abrDailyAck'
import { ertGasTestTasksForUser } from '../lib/ertGasTestHints'
import { permitterPreWorkTasksForUser } from '../lib/permitterPreWorkHints'
import {
  isPermitSigningRejected,
  rejectedPermitsForUser,
  shouldShowRejectionNotice,
} from '../lib/permitRejectionDisplay'
import { workStopResolutionNoticesForUser } from '../lib/workStopResolutionNotices'
import { isInspectorUser } from '../lib/inspectorAccess'
import { pendingWorkStopPermits } from '../lib/pendingWorkStopPermits'
import {
  inspectorRejectedPermitQueue,
  type InspectorRejectedAction,
} from '../lib/inspectorRejectedPermit'
import {
  filterPermitsForUser,
  canUserCreatePermitPackage,
  journalEmptyHint,
} from '../lib/permitAccess'
import { canUserDeletePermit } from '../lib/permitDelete'
import {
  cleanupOrphanSigningInvitesClient,
  renumberPermitsClient,
} from '../lib/renumberPermits'
import { filterByExistingPermits } from '../lib/cleanupPermitRelatedData'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import { notifyPermitNoticesRefresh } from '../lib/refreshPermitNotices'
import { downloadPermitsCsv } from '../lib/exportPermitsCsv'
import type { Permit, PermitStatus } from '../types/domain'

type JournalFilter =
  | 'all'
  | 'on_approval'
  | 'rejected'
  | 'issued'
  | 'active'
  | 'closed'

type JournalViewTab = 'issued' | 'archive' | 'search'

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
  const c = t.common
  const approval = t.approval
  const abrDaily = t.abrDailyAck
  const inv = t.invites
  const jt = t.journalTable

  const {
    permits: allPermits,
    user,
    resolveUser,
    authMode,
    deletePermit,
    deleteAllPermits,
    refresh,
    userDirectory,
    resolveWorkStop,
    resolveRejectedPermit,
  } = useSession()

  const [busy, setBusy] = useState(false)
  const [workStopResolveBusy, setWorkStopResolveBusy] = useState(false)
  const [workStopResolvePermitId, setWorkStopResolvePermitId] = useState<string | null>(null)
  const [rejectedResolveBusy, setRejectedResolveBusy] = useState(false)
  const [rejectedResolvePermitId, setRejectedResolvePermitId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all')
  const [journalViewTab, setJournalViewTab] = useState<JournalViewTab>('search')
  const [searchQuery, setSearchQuery] = useState('')

  const permits = useMemo(
    () => filterPermitsForUser(allPermits, user, userDirectory),
    [allPermits, user, userDirectory],
  )
  const livePermitIds = useMemo(
    () => new Set(allPermits.map((p) => p.id)),
    [allPermits],
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

  const pending = user ? pendingApprovalsForUser(permits, user, resolveUser, userDirectory) : []
  const signingInvitesRaw = useSigningInvites(user?.id)
  const signingInvites = useMemo(
    () => filterByExistingPermits(signingInvitesRaw, livePermitIds),
    [signingInvitesRaw, livePermitIds],
  )
  const pendingWithoutInviteDup = pending.filter((item) => {
    if (item.action === 'issue_permit') return true
    return !signingInvites.some((invItem) => invItem.permitId === item.permit.id)
  })
  const dailyAckPending = useMemo(
    () => (user ? pendingAbrDailyAckPermitsForUser(permits, user.id) : []),
    [permits, user],
  )

  const { dismissed: dismissedRejections, dismiss: dismissRejection } =
    useDismissedRejectionNotices(user?.id)
  const { dismissed: dismissedWorkStopResolutions, dismiss: dismissWorkStopResolution } =
    useWorkStopResolutionDismissal(user?.id)
  const { dismissed: dismissedWorkStopPending, dismiss: dismissWorkStopPending } =
    useDismissedWorkStopPendingAlerts(user?.id)
  const rejectedPermits = user
    ? rejectedPermitsForUser(permits, user, dismissedRejections)
    : []
  const workStopResolutionNotices = useMemo(
    () => workStopResolutionNoticesForUser(permits, user?.id, dismissedWorkStopResolutions),
    [permits, user?.id, dismissedWorkStopResolutions],
  )

  const workStopAlertsRaw = useWorkStopAlerts(
    user && isInspectorUser(user) ? user.id : undefined,
  )
  const workStopAlerts = useMemo(
    () => filterByExistingPermits(workStopAlertsRaw, livePermitIds),
    [workStopAlertsRaw, livePermitIds],
  )
  const inspectorPendingWorkStops = useMemo(
    () => (user && isInspectorUser(user) ? pendingWorkStopPermits(allPermits) : []),
    [allPermits, user],
  )
  const inspectorRejectedQueue = useMemo(
    () => (user && isInspectorUser(user) ? inspectorRejectedPermitQueue(allPermits) : []),
    [allPermits, user],
  )

  async function handleResolveRejectedFromJournal(
    permitId: string,
    action: InspectorRejectedAction,
    comment: string,
  ) {
    setRejectedResolveBusy(true)
    setRejectedResolvePermitId(permitId)
    try {
      await resolveRejectedPermit(permitId, action, comment)
      await refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setRejectedResolveBusy(false)
      setRejectedResolvePermitId(null)
    }
  }

  async function handleResolveWorkStopFromJournal(
    permitId: string,
    action: WorkStopResolveAction,
    comment: string,
  ) {
    setWorkStopResolveBusy(true)
    setWorkStopResolvePermitId(permitId)
    try {
      await resolveWorkStop(permitId, action, comment)
      notifyWorkStopAlertsRefresh()
      await refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkStopResolveBusy(false)
      setWorkStopResolvePermitId(null)
    }
  }
  const allPermitNotices = usePermitNotices(user?.id)
  const { dismissed: dismissedNotices, dismiss: dismissNotice } =
    useDismissedPermitNotices(user?.id)
  const permitNotices = useMemo(
    () =>
      filterByExistingPermits(
        allPermitNotices.filter((n) => !dismissedNotices.has(n.id)),
        livePermitIds,
      ),
    [allPermitNotices, dismissedNotices, livePermitIds],
  )
  const ertGasTasks = useMemo(
    () => ertGasTestTasksForUser(permits, user),
    [permits, user],
  )
  const permitterPreWorkTasks = useMemo(
    () => permitterPreWorkTasksForUser(permits, user, resolveUser, userDirectory),
    [permits, user, resolveUser, userDirectory],
  )

  const canCreate = canUserCreatePermitPackage(user)
  const canDeleteAll = user ? canUserDeletePermit(user) : false
  const canRenumber = user?.role === 'coordinator' && allPermits.length > 0
  const canCleanupInvites = user?.role === 'coordinator' && authMode === 'firebase'
  const isCoordinator = user?.role === 'coordinator'
  const isErt = user?.role === 'ert'

  const permitCreatedAtIso = (permitId: string) =>
    allPermits.find((p) => p.id === permitId)?.createdAtIso

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
      notifyPermitNoticesRefresh()
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
      notifyPermitNoticesRefresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.alerts.deleteFailed)
    } finally {
      setDeletingId(null)
    }
  }

  function selectJournalViewTab(tab: JournalViewTab) {
    setJournalViewTab(tab)
    if (tab === 'issued') setJournalFilter('active')
    else if (tab === 'archive') setJournalFilter('closed')
    else setJournalFilter('all')
  }

  return (
    <div className="page">
      <div className="journal-hero card">
        <div className="journal-hero__content">
          <h1 className="journal-hero__title">{j.title}</h1>
          <p className="muted small journal-hero__subtitle">{j.subtitle}</p>
          {isCoordinator ? (
            <div className="journal-view-tabs" role="tablist" aria-label={j.title}>
              {(
                [
                  ['issued', j.tabIssued],
                  ['archive', j.tabArchive],
                  ['search', j.tabSearch],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={journalViewTab === id}
                  className={`journal-view-tab${journalViewTab === id ? ' journal-view-tab--active' : ''}`}
                  onClick={() => selectJournalViewTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="journal-hero__actions">
            {canCreate ? (
              <Link className="btn primary journal-hero__cta" to="/ppr?fresh=1">
                + {j.createPermit}
              </Link>
            ) : null}
            {isCoordinator ? (
              <>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={permits.length === 0}
                  onClick={() =>
                    downloadPermitsCsv(
                      permits,
                      `journal-nd-${new Date().toISOString().slice(0, 10)}.csv`,
                    )
                  }
                >
                  {j.exportExcel}
                </button>
                <Link className="btn ghost" to="/admin">
                  {j.openAdmin}
                </Link>
              </>
            ) : null}
          </div>
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

      <ErtGasTestTasksPanel tasks={ertGasTasks} />

      {isInspectorUser(user) ? (
        <>
          <InspectorRejectedPermitsPanel
            permits={inspectorRejectedQueue}
            resolveUser={resolveUser}
            busy={rejectedResolveBusy}
            busyPermitId={rejectedResolvePermitId}
            onResolve={handleResolveRejectedFromJournal}
          />
          <WorkStopAlertsPanel
            alerts={workStopAlerts}
            pendingPermits={inspectorPendingWorkStops}
            dismissedPermitIds={dismissedWorkStopPending}
            busy={workStopResolveBusy}
            busyPermitId={workStopResolvePermitId}
            onResolve={handleResolveWorkStopFromJournal}
            onDismiss={dismissWorkStopPending}
          />
          {workStopAlerts.length === 0 &&
          inspectorPendingWorkStops.length === 0 &&
          user ? (
            <section className="card muted" style={{ marginBottom: '1rem' }}>
              <p className="small" style={{ margin: 0 }}>
                Очередь остановок пуста. Приостановка работ доступна на{' '}
                <strong>выданных</strong> нарядах (кнопка «Приостановить работы»). Отклонение
                пакета на согласовании — другой процесс; инженер решает только остановку работ.
              </p>
              <p className="xsmall muted" style={{ margin: '0.5rem 0 0' }}>
                Вход: temirlan-safety@nova.local · роль: {user.role}
              </p>
            </section>
          ) : null}
        </>
      ) : null}

      <PermitNoticesPanel notices={permitNotices} onDismiss={dismissNotice} />

      {!isErt && !isInspectorUser(user) ? (
        <RejectedPermitsPanel
          permits={rejectedPermits}
          resolveUser={resolveUser}
          onDismiss={dismissRejection}
        />
      ) : null}

      <SigningInvitesPanel
        invites={signingInvites}
        permitCreatedAtIso={permitCreatedAtIso}
        title={user?.role === 'executor' ? inv.ackTitle : inv.signTitle}
      />

      {user?.role === 'permitter' ? (
        <PermitterPreWorkTasksPanel tasks={permitterPreWorkTasks} />
      ) : null}

      <WorkStopResolutionNoticesPanel
        permits={workStopResolutionNotices}
        onDismiss={dismissWorkStopResolution}
      />

      {dailyAckPending.length > 0 ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>{abrDaily.pendingTitle}</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {abrDaily.pendingHint}
          </p>
          <ul className="compact-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {dailyAckPending.map((permit) => (
              <li
                key={permit.id}
                className="card"
                style={{ marginBottom: '0.65rem', padding: '0.85rem' }}
              >
                <div className="row-inline" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <StatusBadge status={permit.status} />
                  <span className="strong">{permit.title}</span>
                  <span className="small muted">
                    № {permit.registrationRefNo || '—'}
                  </span>
                </div>
                <Link className="btn primary small" to={`/p/${permit.id}`} style={{ marginTop: '0.65rem' }}>
                  {abrDaily.openPermit}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isErt && pendingWithoutInviteDup.length > 0 ? (
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
            {journalEmptyHint(user, j)}
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
            {journalFilter === 'issued'
              ? j.emptyFilterIssued
              : filterCounts.on_approval > 0 && journalFilter !== 'on_approval'
                ? `В журнале ${filterCounts.on_approval} наряд(ов) на согласовании — откройте фильтр «На согласовании» или блок выше.`
                : j.emptyFilterOther}
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
                  <th>{jt.regNo}</th>
                  <th>{jt.siteTopic}</th>
                  <th>{jt.workTypes}</th>
                  <th>{jt.status}</th>
                  <th>{jt.updated}</th>
                  {canDeleteAll ? <th>{jt.admin}</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredPermits.map((p) => (
                  <tr key={p.id}>
                    <td className="small muted">{p.registrationRefNo || '—'}</td>
                    <td>
                      <Link to={`/p/${p.id}`} className="journal-permit-link">
                        <div className="strong">{p.title || c.untitled}</div>
                        <div className="small muted">{p.siteName || '—'}</div>
                      </Link>
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
