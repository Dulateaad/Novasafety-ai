import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSession, useJournal } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { StatusBadge } from '../components/StatusBadge'
import { EgovSignatureRoleRow } from '../components/EgovSignatureRoleRow'
import { CrewAckSignRow } from '../components/CrewAckSignRow'
import { WorkerCrewAckPanel } from '../components/WorkerCrewAckPanel'
import { PermitOnApprovalSummary } from '../components/PermitOnApprovalSummary'
import { WorkStopActionCard } from '../components/WorkStopActionCard'
import { WorkStopModal } from '../components/WorkStopModal'
import {
  InspectorWorkStopPanel,
  WorkStopStatusBanner,
} from '../components/InspectorWorkStopPanel'
import { ErtGasTestLivePanel } from '../components/ErtGasTestLivePanel'
import { PermitterPreWorkLivePanel } from '../components/PermitterPreWorkLivePanel'
import { PerformerGasTestModesPanel } from '../components/PerformerGasTestModesPanel'
import { PermitEarlyCloseCard } from '../components/PermitEarlyCloseCard'
import { PermitExtensionCard } from '../components/PermitExtensionCard'
import { AbrDailyAckPanel } from '../components/AbrDailyAckPanel'
import { CrewManagementPanel } from '../components/CrewManagementPanel'
import { ReplacePerformerPanel } from '../components/ReplacePerformerPanel'
import { WorkPermissionClosurePanel } from '../components/WorkPermissionClosurePanel'
import { PermitCoordinatorOverview } from '../components/PermitCoordinatorOverview'
import { PermitPackageBriefCard } from '../components/PermitPackageBrief'
import type { PackagePermissionBrief } from '../components/PermitPackageBrief'
import { DocumentKitSummary } from '../components/DocumentKitSummary'
import { userById } from '../demoUsers'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { PTW_SITE_OPTIONS } from '../config/ptwSites'
import {
  allowedNextStatuses,
  canUserTriggerStatus,
  issueStatusPatchIfApprovalsComplete,
  validateTransition,
} from '../lib/transitions'
import { matrixRow } from '../lib/matrix'
import { addOneCalendarMonthFromStart } from '../lib/calendarMonth'
import { formatStoredDateTime, toDatetimeLocalInput, normalizeDatetimeLocalInput } from '../lib/datetimeLocal'
import {
  canUserSubmitPermitPackage,
  canViewPermitDetailTechnicalBlocks,
  isUserOnPermitCrew,
} from '../lib/permitAccess'
import { isCrewAckPeriodActive } from '../lib/crewAckEligibility'
import { isPermitSigningRejected } from '../lib/permitRejectionDisplay'
import {
  restorePackageSessionFromPermit,
  resolvePackageResumeRoute,
} from '../lib/resumePermitPackage'
import { canUserInitiateWorkStop, isInspectorUser } from '../lib/inspectorAccess'
import { InspectorRejectedPermitPanel } from '../components/InspectorRejectedPermitPanel'
import type { InspectorRejectedAction } from '../lib/inspectorRejectedPermit'
import { notifyWorkStopAlertsRefresh } from '../lib/refreshWorkStopAlerts'
import {
  signingRoleOrder,
  mergePermitAfterEgovSign,
  canSignRoleNow,
  approvalStepLabel,
  waitingHint,
  permitSigningPhaseActive,
} from '../lib/approvalSequence'
import { permitWithNormalizedWorkPermissions } from '../lib/permitterPreWorkHints'
import { actorMatchesAssigneeForRole, isRoleSigned } from '../lib/signatureStatus'
import { signEligibilityForRole } from '../lib/signEligibility'
import { canUserRejectPermit, rejectionPatch } from '../lib/approvalActions'
import { resolveUserBadgeNo } from '../lib/userBadgeNumbers'
import { scrollAppToTopWithRetries, scrollToElementWithRetries } from '../lib/scrollAppToTop'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import { allCrewAcknowledged } from '../lib/crewAckComplete'
import { permitVisibleToPermitter } from '../lib/permitterApprovalGate'
import { canUserSignCrewAck } from '../lib/crewAckEligibility'
import { resolveWorkerUid } from '../lib/resolveWorkerUid'
import { provisionPermitSignersClient } from '../lib/provisionSigners'
import { canUserDeletePermit } from '../lib/permitDelete'
import {
  buildPackagePdf,
  buildPermitPackagePartPdf,
  preloadPackagePdfEngine,
  viewPackagePdf,
} from '../lib/buildPackagePdf'
import type { PackagePdfPart } from '../lib/buildPackagePdf'
import { buildPermitPackageBrief } from '../lib/permitPackageBrief'
import { canCloseNdprEarly, isPermitPostApproval, isPermitProducer } from '../lib/closeNdprEarly'
import { syncWorkPermissionsLive } from '../lib/syncWorkPermissionsLive'
import { permissionNoticesForActivities } from '../lib/workPermissions'
import { GasTestResultsReadOnlyCard } from '../components/GasTestResultsReadOnlyCard'
import {
  canErtEditGasTests,
  gasTestDocFilled,
  permitHasGasTestDocuments,
} from '../lib/ertGasTestHints'
import { openPprAttachmentInBrowser } from '../lib/pprAttachment'
import { openWorkPermissionPdf } from '../lib/openWorkPermissionPdf'
import type { WorkPermissionKind, WorkPermissionsBundle } from '../types/workPermissions'
import {
  fillTemplate,
  formatSpecialWorkLabelsLocalized,
  roleLabel,
} from '../i18n/getLocale'
import type { WorkStopPhoto } from '../types/workStop'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import type { StoredCrewAckSignature } from '../types/crewAck'
import type { PermitStatus } from '../types/domain'
import { STATUS_LABELS, ZONE_CLASS_LABELS, PERMIT_TYPE_LABELS } from '../types/domain'

export function PermitDetailPage() {
  const { id } = useParams()
  const {
    permits,
    user,
    authMode,
    updatePermit,
    transition,
    deletePermit,
    resolveUser,
    userDirectory,
    refresh,
    requestWorkStop,
    resolveWorkStop,
    resolveRejectedPermit,
  } = useSession()
  const { t, language } = useLanguage()
  const dp = t.detailPage
  const df = t.detailForm
  const c = t.common
  const journal = useJournal(id)
  const nav = useNavigate()
  const location = useLocation()
  const [workStopOpen, setWorkStopOpen] = useState(false)
  const [workStopBusy, setWorkStopBusy] = useState(false)
  const [closeBusy, setCloseBusy] = useState(false)
  const [pdfPackageBusy, setPdfPackageBusy] = useState(false)
  const [viewingPart, setViewingPart] = useState<PackagePdfPart | null>(null)
  const [viewingPermission, setViewingPermission] = useState<WorkPermissionKind | null>(null)
  const [savedWorkPermissions, setSavedWorkPermissions] = useState<WorkPermissionsBundle | null>(
    null,
  )
  const provisionWarning =
    (location.state as { provisionWarning?: string } | null)?.provisionWarning ?? null

  const permit = permits.find((p) => p.id === id)
  useEffect(() => {
    setSavedWorkPermissions(null)
  }, [permit?.id])

  const packageBrief = useMemo(
    () => (permit ? buildPermitPackageBrief(permit, resolveUser) : null),
    [permit, resolveUser],
  )
  const showPackageSection = Boolean(
    permit && (permit.status !== 'draft' || permit.packagePdf),
  )
  const permissionTemplates = useMemo(
    () => (permit ? permissionNoticesForActivities(permit) : []),
    [permit],
  )
  const permissionBriefs = useMemo((): PackagePermissionBrief[] => {
    if (!permit?.workPermissions?.documents?.length) return []
    return permit.workPermissions.documents.map((doc) => ({
      kind: doc.kind,
      label: WORK_PERMISSION_BY_KIND[doc.kind].label,
      hasPdf: Boolean(doc.pdfBase64 || doc.generatedAtIso),
      requiresGasTests: WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests,
      gasTestsFilled: WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests
        ? gasTestDocFilled(doc)
        : undefined,
    }))
  }, [permit])
  const signingPermit = useMemo(
    () =>
      permit
        ? permitWithNormalizedWorkPermissions(permit, savedWorkPermissions ?? permit.workPermissions)
        : null,
    [permit, savedWorkPermissions],
  )
  const showOperationalBlocks = Boolean(permit && isPermitPostApproval(permit))

  useEffect(() => {
    void preloadPackagePdfEngine()
  }, [])

  useEffect(() => {
    const hash = location.hash.slice(1)
    const scrollTargets = new Set([
      'ert-gas-tests',
      'permitter-pre-work',
      'work-stop-section',
      'inspector-rejected-section',
      'pdf-package',
    ])
    if (!hash || !scrollTargets.has(hash)) return
    if (hash === 'pdf-package' && !showPackageSection) return
    const cancel =
      hash === 'pdf-package'
        ? scrollToElementWithRetries(document.getElementById(hash))
        : scrollAppToTopWithRetries(document.getElementById(hash))
    return cancel
  }, [
    location.hash,
    id,
    showPackageSection,
    packageBrief,
    permit?.workPermissions?.documents?.length,
    permit?.workStop?.status,
  ])

  useEffect(() => {
    if (!user || !permit) return
    if (permit.status !== 'draft' || !canUserSubmitPermitPackage(user) || isPermitSigningRejected(permit)) return
    restorePackageSessionFromPermit(permit)
    nav(resolvePackageResumeRoute(permit, user, userDirectory), { replace: true })
  }, [user, permit, userDirectory, nav])

  if (!user) return null

  const actor = user

  if (!id || !permit) {
    return (
      <div className="page">
        <p>{dp.notFound}</p>
        <Link to="/">{dp.backToList}</Link>
      </div>
    )
  }

  const p = permit
  const signingP = signingPermit ?? p

  async function openFullPackagePdf() {
    setPdfPackageBusy(true)
    try {
      viewPackagePdf(await buildPackagePdf(p, resolveUser, userDirectory))
    } catch {
      window.alert(t.modals.pdfPackageFailed)
    } finally {
      setPdfPackageBusy(false)
    }
  }

  async function openPackagePartPdf(part: PackagePdfPart) {
    setViewingPart(part)
    try {
      viewPackagePdf(await buildPermitPackagePartPdf(part, p, resolveUser, userDirectory))
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t.modals.pdfPackageFailed)
    } finally {
      setViewingPart(null)
    }
  }

  async function openPermissionPdf(kind: WorkPermissionKind) {
    const doc = p.workPermissions?.documents.find((d) => d.kind === kind)
    if (!doc) return
    setViewingPermission(kind)
    try {
      await openWorkPermissionPdf(doc, p)
    } finally {
      setViewingPermission(null)
    }
  }

  if (p.status === 'draft' && canUserSubmitPermitPackage(actor) && !isPermitSigningRejected(p)) {
    return (
      <div className="page">
        <p className="muted">{dp.openingDraft}</p>
      </div>
    )
  }

  if (
    actor.role === 'executor' &&
    (!isUserOnPermitCrew(p, actor.id, actor, userDirectory) || p.status === 'draft')
  ) {
    return (
      <div className="page">
        <p>{dp.unavailable}</p>
        <Link to="/">{dp.backToList}</Link>
      </div>
    )
  }

  if (
    actor.role === 'permitter' &&
    p.status === 'on_approval' &&
    !permitVisibleToPermitter(p, actor, userDirectory)
  ) {
    return (
      <div className="page">
        <p className="muted" style={{ maxWidth: '36rem' }}>
          Наряд и задания допускающего появятся после подписи производителя работ и ознакомления
          бригады с АБР и оценкой рисков.
        </p>
        <Link to="/">{dp.backToList}</Link>
      </div>
    )
  }

  const showTechnicalBlocks = canViewPermitDetailTechnicalBlocks(actor)
  const matrixInfo = showTechnicalBlocks ? matrixRow(p.category) : null

  function canUserSignRole(role: EgovSignRole): boolean {
    if (!permitSigningPhaseActive(signingP) || isPermitSigningRejected(signingP)) {
      return false
    }
    return signEligibilityForRole(signingP, actor, role, resolveUser, userDirectory).canSign
  }

  function approvalSignWaitingMessage(role: EgovSignRole): string | null {
    if (canUserSignRole(role)) return null
    return (
      signEligibilityForRole(signingP, actor, role, resolveUser, userDirectory).reason ??
      waitingHint(signingP, role, resolveUser, userDirectory)
    )
  }

  const showApprovalFlow = permitSigningPhaseActive(p)

  const showInteractiveApproval = actor.role !== 'executor' && showApprovalFlow

  const showWorkStopBtn =
    canUserInitiateWorkStop(p, actor) &&
    p.status !== 'closed' &&
    p.status !== 'archived' &&
    p.status !== 'annulled'

  const showInspectorWorkStop = p.workStop?.status === 'pending'
  const showInspectorRejected =
    isInspectorUser(actor) && isPermitSigningRejected(p) && Boolean(p.lastRejection)

  const workStopInspectorBlock = (
    <>
      <WorkStopStatusBanner permit={p} userId={actor.id} />
      <InspectorWorkStopPanel
        permit={p}
        actor={actor}
        busy={workStopBusy}
        onResolve={(action, comment) => void handleResolveWorkStop(action, comment)}
      />
    </>
  )

  async function handleResolveRejectedPermit(
    action: InspectorRejectedAction,
    comment: string,
  ) {
    setWorkStopBusy(true)
    try {
      await resolveRejectedPermit(p.id, action, comment)
      await refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkStopBusy(false)
    }
  }

  async function closePermitEarly() {
    if (!canCloseNdprEarly(p, actor, userDirectory)) return
    if (!window.confirm(dp.closeEarlyConfirm)) return
    setCloseBusy(true)
    try {
      await transition(p.id, 'closed')
      const closedPermit = { ...p, status: 'closed' as const }
      if (p.workPermissions?.documents?.length) {
        await syncWorkPermissionsLive({
          permit: closedPermit,
          bundle: p.workPermissions,
          updatePermit,
          resolveUser,
          userDirectory,
          rebuildPackage: true,
        })
      }
      if (authMode === 'firebase') await refresh()
      window.location.hash = 'work-perm-closure'
      requestAnimationFrame(() => {
        document
          .getElementById('work-perm-closure')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } finally {
      setCloseBusy(false)
    }
  }

  async function submitWorkStop(reason: string, photo?: WorkStopPhoto) {
    setWorkStopBusy(true)
    try {
      await requestWorkStop(p.id, reason, photo)
      notifyWorkStopAlertsRefresh()
      setWorkStopOpen(false)
      await refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkStopBusy(false)
    }
  }

  async function handleResolveWorkStop(action: WorkStopResolveAction, comment: string) {
    setWorkStopBusy(true)
    try {
      await resolveWorkStop(p.id, action, comment)
      notifyWorkStopAlertsRefresh()
      await refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setWorkStopBusy(false)
    }
  }

  const locked = p.status === 'closed' || p.status === 'archived' || p.status === 'annulled'

  const signingRoles = signingRoleOrder(p)

  const showApprovalHistory =
    actor.role !== 'executor' &&
    !showApprovalFlow &&
    ['issued', 'in_progress', 'suspended', 'closed', 'archived'].includes(p.status) &&
    signingRoles.some((role) => isRoleSigned(p, role))

  function canEditWorkFields(): boolean {
    if (locked) return false
    return (
      actor.role === 'coordinator' ||
      actor.role === 'issuer' ||
      actor.role === 'permitter' ||
      actor.role === 'performer'
    )
  }

  const actorOnCrew = isUserOnPermitCrew(p, actor.id, actor, userDirectory)

  const showCrewAckSection =
    (actor.role === 'executor' || actor.role === 'coordinator') &&
    actorOnCrew &&
    isCrewAckPeriodActive(p.status)

  const nextStatuses = allowedNextStatuses(p.status).filter((next) => {
    if (!canUserTriggerStatus(p, next, actor.role)) return false
    const v = validateTransition(p, next)
    return v.ok
  })

  const blockedNext = allowedNextStatuses(p.status).filter((next) => {
    if (!canUserTriggerStatus(p, next, user.role)) return false
    return !validateTransition(p, next).ok
  })

  async function go(next: PermitStatus) {
    await transition(p.id, next)
  }

  async function rejectPermit() {
    const comment = window.prompt(t.detail.rejectPrompt)
    if (!comment?.trim()) return
    await updatePermit(p.id, rejectionPatch(comment, actor))
    await transition(p.id, 'rejected')
  }

  function canRejectAs(role: EgovSignRole): boolean {
    if (!canUserRejectPermit(signingP, actor, userDirectory)) return false
    if (actor.role === 'coordinator') return canSignRoleNow(signingP, role, userDirectory)
    return (
      actorMatchesAssigneeForRole(signingP, role, actor, userDirectory) &&
      canSignRoleNow(signingP, role, userDirectory)
    )
  }


  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, userDirectory)

  function saveEgovSignature(role: EgovSignRole, sig: StoredEgovSignature) {
    void updatePermit(p.id, mergePermitAfterEgovSign(p, role, sig, resolveBadge)).then(
      () => {
        notifySigningInvitesRefresh()
      },
    )
    if (authMode === 'firebase') void refresh()
  }

  function saveCrewAck(sig: StoredCrewAckSignature) {
    const signerUid = sig.signedByUid.trim()
    const nextExecutors = p.executors.map((ex) => {
      const raw = ex.userUid.trim()
      if (!raw) return ex
      const resolved = resolveWorkerUid(userDirectory, raw)
      if (raw === signerUid || resolved === signerUid) {
        return { ...ex, briefingAcknowledged: true }
      }
      return ex
    })
    const nextCrewAck: Record<string, StoredCrewAckSignature> = {
      ...Object.fromEntries(
        Object.entries(p.crewAckSignatures ?? {}).filter(
          (entry): entry is [string, StoredCrewAckSignature] => Boolean(entry[1]),
        ),
      ),
      [signerUid]: sig,
    }
    for (const ex of p.executors) {
      const raw = ex.userUid.trim()
      if (!raw || raw === signerUid) continue
      const resolved = resolveWorkerUid(userDirectory, raw)
      if (resolved === signerUid) {
        nextCrewAck[raw] = sig
      }
    }
    void updatePermit(p.id, {
      executors: nextExecutors,
      crewAckSignatures: {
        [sig.signedByUid]: sig,
      },
      ...issueStatusPatchIfApprovalsComplete(
        {
          ...p,
          executors: nextExecutors,
          crewAckSignatures: nextCrewAck,
        },
        userDirectory,
      ),
    }).then(async () => {
      notifySigningInvitesRefresh()
      if (
        authMode === 'firebase' &&
        allCrewAcknowledged(
          {
            ...p,
            executors: nextExecutors,
            crewAckSignatures: nextCrewAck,
          },
          userDirectory,
        )
      ) {
        await provisionPermitSignersClient(p.id)
        notifySigningInvitesRefresh()
      }
    })
    if (authMode === 'firebase') void refresh()
  }

  function canSignCrewAck(): boolean {
    return canUserSignCrewAck(p, actor.id, actor.role, actor, userDirectory)
  }

  async function removePermit() {
    if (!canUserDeletePermit(actor)) return
    const label = p.registrationRefNo || p.title
    if (!window.confirm(fillTemplate(t.confirm.deletePermit, { label }))) {
      return
    }
    await deletePermit(p.id)
    nav('/')
  }

  const canDelete = canUserDeletePermit(actor)
  const isWorkerView = actor.role === 'executor'

  return (
    <div className={`page${isWorkerView ? ' worker-crew-ack-page' : ''}`}>
      <div className="page-header">
        <div>
          <Link className="small muted" to="/">
            ← {c.back}
          </Link>
          <h1>{p.title}</h1>
          <div className="row-inline">
            <StatusBadge status={p.status} />
            <span className="small muted">
              {fillTemplate(df.versionLabel, { version: p.version })} ·{' '}
              {formatSpecialWorkLabelsLocalized(
                p.specialWorkActivities,
                p.specialWorkActivity,
                language,
              )}{' '}
              ·{' '}
              {ZONE_CLASS_LABELS[p.zoneClass]}
            </span>
          </div>
        </div>
        {canDelete && (
          <button type="button" className="btn ghost small" onClick={() => void removePermit()}>
            {c.delete} {c.permit.toLowerCase()}
          </button>
        )}
      </div>

      {provisionWarning ? (
        <div className="card alert" role="status" style={{ marginBottom: '1rem' }}>
          <p className="small" style={{ margin: 0 }}>
            {provisionWarning}
          </p>
        </div>
      ) : null}

      {showPackageSection && packageBrief && !isWorkerView ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 id="pdf-package" className="pdf-package-heading" style={{ marginTop: 0 }}>
            {dp.viewFullPdf}
          </h2>
          {permissionTemplates.length > 0 ? (
            <DocumentKitSummary templates={permissionTemplates} />
          ) : null}
          <PermitPackageBriefCard
            brief={packageBrief}
            permissions={permissionBriefs}
            showDocLinks
            onViewPart={(part) => void openPackagePartPdf(part)}
            onViewPpr={
              p.ppr?.attachment
                ? () => {
                    openPprAttachmentInBrowser(p.ppr!.attachment!)
                  }
                : undefined
            }
            onViewPermission={(kind) => void openPermissionPdf(kind)}
            onViewFullPackage={() => void openFullPackagePdf()}
            viewingPart={viewingPart}
            viewingPermission={viewingPermission}
            viewingFullPackage={pdfPackageBusy}
          />
        </section>
      ) : null}

      {showCrewAckSection && isWorkerView ? (
        <WorkerCrewAckPanel
          permit={p}
          actor={actor}
          brief={packageBrief}
          canSign={canSignCrewAck()}
          userDirectory={userDirectory}
          onSigned={saveCrewAck}
        />
      ) : showCrewAckSection ? (
        <section className="card" id="crew-ack-section">
          <h2 style={{ marginTop: 0 }}>{t.approval.crewSection}</h2>
          <CrewAckSignRow
            permit={p}
            actor={actor}
            canSign={canSignCrewAck()}
            userDirectory={userDirectory}
            onSigned={saveCrewAck}
          />
        </section>
      ) : null}

      {actor.role === 'permitter' &&
      p.status !== 'closed' &&
      p.workPermissions?.documents?.length &&
      permitVisibleToPermitter(p, actor, userDirectory) ? (
        <PermitterPreWorkLivePanel
          permit={p}
          actor={actor}
          updatePermit={updatePermit}
          resolveUser={resolveUser}
          userDirectory={userDirectory}
          refresh={refresh}
          onSaved={(bundle) => {
            setSavedWorkPermissions(bundle)
          }}
          onDraftChange={(_bundle, isDirty) => {
            if (isDirty) setSavedWorkPermissions(null)
          }}
        />
      ) : null}

      {showInteractiveApproval || showApprovalHistory ? (
        <>
          <PermitOnApprovalSummary
            permit={signingP}
            resolveUser={resolveUser}
            userDirectory={userDirectory}
            crewAckAction={
              canSignCrewAck() ? (
                <CrewAckSignRow
                  permit={p}
                  actor={actor}
                  canSign={canSignCrewAck()}
                  userDirectory={userDirectory}
                  onSigned={saveCrewAck}
                />
              ) : undefined
            }
          />

          <section className="card" id="signatures-section">
            <h2 style={{ marginTop: 0 }}>
              {showInteractiveApproval
                ? t.signing.signaturesTitle
                : t.signing.signaturesHistoryTitle}
            </h2>
            <p className="small muted" style={{ marginTop: 0 }}>
              {showInteractiveApproval
                ? t.detail.signViaEgov
                : t.signing.signaturesHistoryHint}
            </p>
            <div className="egov-sign-list">
              {signingRoles.map((role) => (
                <EgovSignatureRoleRow
                  key={role}
                  permit={signingP}
                  role={role}
                  actor={actor}
                  canSign={showInteractiveApproval && canUserSignRole(role)}
                  stepTitle={approvalStepLabel(role, p, resolveUser)}
                  waitingMessage={approvalSignWaitingMessage(role)}
                  canReject={showInteractiveApproval && canRejectAs(role)}
                  onReject={() => void rejectPermit()}
                  onSaveSignature={(sig) => saveEgovSignature(role, sig)}
                  resolveUser={resolveUser}
                  userDirectory={userDirectory}
                />
              ))}
            </div>
          </section>

        </>
      ) : null}

      {showInspectorRejected ? (
        <InspectorRejectedPermitPanel
          permit={p}
          actor={actor}
          resolveUser={resolveUser}
          busy={workStopBusy}
          onResolve={(action, comment) => void handleResolveRejectedPermit(action, comment)}
        />
      ) : null}

      {showInspectorWorkStop ? workStopInspectorBlock : null}

      {p.status === 'closed' &&
      isPermitProducer(p, actor, userDirectory) &&
      p.workPermissions?.documents?.length ? (
        <div className="card alert" role="status" style={{ marginBottom: '1rem' }}>
          <p className="small" style={{ margin: 0 }}>
            Наряд закрыт. Заполните раздел «Передача рабочего участка / закрытие» и сохраните — данные
            попадут в PDF и журнал.
          </p>
        </div>
      ) : null}

      {p.status === 'closed' && p.workPermissions?.documents?.length ? (
        <WorkPermissionClosurePanel
          permit={p}
          actor={actor}
          updatePermit={updatePermit}
          resolveUser={resolveUser}
          userDirectory={userDirectory}
        />
      ) : null}

      {actor.role === 'ert' &&
      canErtEditGasTests(p) &&
      permitHasGasTestDocuments(p) &&
      p.workPermissions?.documents?.length ? (
        <ErtGasTestLivePanel
          permit={p}
          actor={actor}
          updatePermit={updatePermit}
          resolveUser={resolveUser}
          userDirectory={userDirectory}
          refresh={refresh}
        />
      ) : null}

      {showOperationalBlocks ? (
        <>
          <PermitEarlyCloseCard
            permit={p}
            actor={actor}
            userDirectory={userDirectory}
            busy={closeBusy}
            onClose={() => void closePermitEarly()}
          />

          <PermitExtensionCard permit={p} actor={actor} />

          <CrewManagementPanel permit={p} actor={actor} />

          <ReplacePerformerPanel permit={p} actor={actor} />
        </>
      ) : null}

      {actor.role === 'performer' &&
      p.status !== 'closed' &&
      p.workPermissions?.documents?.length ? (
        <PerformerGasTestModesPanel
          permit={p}
          actor={actor}
          updatePermit={updatePermit}
          resolveUser={resolveUser}
          userDirectory={userDirectory}
          refresh={refresh}
        />
      ) : null}

      {showOperationalBlocks &&
      actor.role !== 'ert' &&
      permitHasGasTestDocuments(p) ? (
        <GasTestResultsReadOnlyCard permit={p} />
      ) : null}

      <AbrDailyAckPanel permit={p} actor={actor} />

      {!showInspectorWorkStop ? workStopInspectorBlock : null}
      {showWorkStopBtn ? (
        <WorkStopActionCard
          disabled={workStopBusy}
          onOpen={() => setWorkStopOpen(true)}
        />
      ) : null}
      <WorkStopModal
        open={workStopOpen}
        busy={workStopBusy}
        onClose={() => setWorkStopOpen(false)}
        onSubmit={(reason, photo) => void submitWorkStop(reason, photo)}
      />

      {actor.role === 'coordinator' && p.status !== 'draft' ? (
        <PermitCoordinatorOverview permit={p} resolveUser={resolveUser} />
      ) : null}

      {showTechnicalBlocks ? (
      <section className="card">
        <h2>Бланк НД — общие поля (F02)</h2>
        <div className="form grid-2" style={{ gap: '0.75rem' }}>
          <label>
            Организация
            <input
              disabled={!canEditWorkFields()}
              value={p.f02.company}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: { ...p.f02, company: e.target.value },
                })
              }
            />
          </label>
          <label>
            № пропуска / бейджа
            <input
              disabled={!canEditWorkFields()}
              value={p.f02.badgeNo}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: { ...p.f02, badgeNo: e.target.value },
                })
              }
            />
          </label>
          <label>
            {df.shift}
            <select
              disabled={!canEditWorkFields()}
              value={p.f02.shift}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: {
                    ...p.f02,
                    shift: e.target.value as typeof p.f02.shift,
                  },
                })
              }
            >
              <option value="">—</option>
              <option value="day">{df.shiftDay}</option>
              <option value="night">{df.shiftNight}</option>
            </select>
          </label>
          <label>
            {df.startDateTime}
            {canEditWorkFields() ? (
              <input
                type="datetime-local"
                disabled={!canEditWorkFields()}
                value={toDatetimeLocalInput(p.f02.startDate)}
                onChange={(e) => {
                  const startDate = normalizeDatetimeLocalInput(e.target.value)
                  void updatePermit(p.id, {
                    f02: {
                      ...p.f02,
                      startDate,
                      endDate: startDate
                        ? addOneCalendarMonthFromStart(startDate)
                        : p.f02.endDate,
                    },
                  })
                }}
              />
            ) : (
              <span>{formatStoredDateTime(p.f02.startDate)}</span>
            )}
          </label>
          <label>
            {df.endDateTime}
            {canEditWorkFields() ? (
              <input
                type="datetime-local"
                disabled={!canEditWorkFields()}
                value={toDatetimeLocalInput(p.f02.endDate)}
                onChange={(e) =>
                  void updatePermit(p.id, {
                    f02: {
                      ...p.f02,
                      endDate: normalizeDatetimeLocalInput(e.target.value),
                    },
                  })
                }
              />
            ) : (
              <span>{formatStoredDateTime(p.f02.endDate)}</span>
            )}
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            Изоляция энергии и пр.
            <textarea
              disabled={!canEditWorkFields()}
              rows={2}
              value={p.f02.safety.isolationOfEnergy}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: {
                    ...p.f02,
                    safety: {
                      ...p.f02.safety,
                      isolationOfEnergy: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Пожаротушение
            <textarea
              disabled={!canEditWorkFields()}
              rows={2}
              value={p.f02.safety.fireFightingEquipment}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: {
                    ...p.f02,
                    safety: {
                      ...p.f02.safety,
                      fireFightingEquipment: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Связь
            <textarea
              disabled={!canEditWorkFields()}
              rows={2}
              value={p.f02.safety.communications}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: {
                    ...p.f02,
                    safety: {
                      ...p.f02.safety,
                      communications: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Ограждение участка
            <textarea
              disabled={!canEditWorkFields()}
              rows={2}
              value={p.f02.safety.workAreaBarricading}
              onChange={(e) =>
                void updatePermit(p.id, {
                  f02: {
                    ...p.f02,
                    safety: {
                      ...p.f02.safety,
                      workAreaBarricading: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
        </div>
      </section>
      ) : null}

      {showTechnicalBlocks ? (
      <div className="grid-2">
        <section className="card">
          <h2>Реквизиты</h2>
          <dl className="kv">
            <dt>Объект / локация</dt>
            <dd>
              {canEditWorkFields() ? (
                <select
                  value={p.siteName}
                  onChange={(e) =>
                    void updatePermit(p.id, { siteName: e.target.value })
                  }
                >
                  {PTW_SITE_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                p.siteName
              )}
            </dd>
            <dt>Тип</dt>
            <dd>
              {PERMIT_TYPE_LABELS[permit.permitType]} · кат. {permit.category}
            </dd>
            <dt>Подрядный</dt>
            <dd>{permit.isContractorPermit ? 'Да' : 'Нет'}</dd>
            <dt>Работы</dt>
            <dd>{permit.workDescription}</dd>
            <dt>Выдающий</dt>
            <dd>
              {userById(permit.issuerUid)?.displayName ?? permit.issuerUid}
            </dd>
            <dt>Допускающий</dt>
            <dd>
              {userById(permit.permitterUid)?.displayName ??
                permit.permitterUid}
            </dd>
            <dt>Производитель работ</dt>
            <dd>
              {userById(permit.performerUid)?.displayName ??
                permit.performerUid}
            </dd>
            {permit.samePersonException.allowed && (
              <>
                <dt>Исключение по ролям</dt>
                <dd>{permit.samePersonException.reason}</dd>
              </>
            )}
          </dl>
          {permit.f04 && (
            <>
              <h3>F04</h3>
              <dl className="kv">
                <dt>№ маршрутной карты</dt>
                <dd>{permit.f04.routeSheetNo}</dd>
                <dt>Зона</dt>
                <dd>{permit.f04.workArea}</dd>
                <dt>Особые условия</dt>
                <dd>{permit.f04.specialConditions}</dd>
              </dl>
            </>
          )}
        </section>

        {matrixInfo ? (
        <section className="card">
          <h2>Матрица (кат. {permit.category})</h2>
          <p className="small muted">
            Документы: {matrixInfo.requiredDocuments.join(', ')}
          </p>
          <p className="small muted">
            Базовый срок: {matrixInfo.defaultValidityDays} дн.
          </p>
        </section>
        ) : null}
      </div>
      ) : null}

      {actor.role !== 'executor' && (
      <>
      <section className="card">
        <h2>Смена статуса</h2>
        <p className="small muted">
          Доступные переходы с учётом роли и правил матрицы/подписей.
        </p>
        <div className="btn-row">
          {nextStatuses.map((next) => (
            <button
              key={next}
              type="button"
              className="btn primary"
              onClick={() => void go(next)}
            >
              → {STATUS_LABELS[next]}
            </button>
          ))}
        </div>
        {blockedNext.length > 0 && (
          <div className="small muted" style={{ marginTop: '0.75rem' }}>
            Недоступно сейчас:
            <ul className="compact-list">
              {blockedNext.map((next) => {
                const v = validateTransition(p, next)
                return (
                  <li key={next}>
                    {STATUS_LABELS[next]}
                    {!v.ok ? ` — ${v.reason}` : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
      </>
      )}

      {actor.role !== 'executor' && (
      <section className="card">
        <h2>{df.f05Title}</h2>
        <ul className="journal">
          {journal.length === 0 && (
            <li className="muted">{df.f05Empty}</li>
          )}
          {journal.map((j) => (
            <li key={j.id}>
              <span className="small muted">
                {new Date(j.atIso).toLocaleString()}
              </span>
              <div>{j.message}</div>
              <div className="small muted">
                {resolveUser(j.actorUid)?.displayName ?? j.actorUid} ·{' '}
                {roleLabel(j.actorRole, language)} · {j.kind}
              </div>
            </li>
          ))}
        </ul>
      </section>
      )}
    </div>
  )
}
