import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSession, useJournal } from '../context/SessionContext'
import { useLanguage } from '../context/LanguageContext'
import { StatusBadge } from '../components/StatusBadge'
import { EgovSignatureRoleRow } from '../components/EgovSignatureRoleRow'
import { CrewAckSignRow } from '../components/CrewAckSignRow'
import { PermitOnApprovalSummary } from '../components/PermitOnApprovalSummary'
import { WorkStopActionCard } from '../components/WorkStopActionCard'
import { WorkStopModal } from '../components/WorkStopModal'
import {
  InspectorWorkStopPanel,
  WorkStopStatusBanner,
} from '../components/InspectorWorkStopPanel'
import { ErtGasTestLivePanel } from '../components/ErtGasTestLivePanel'
import { PermitterPreWorkLivePanel } from '../components/PermitterPreWorkLivePanel'
import { PermitEarlyCloseCard } from '../components/PermitEarlyCloseCard'
import { PermitExtensionCard } from '../components/PermitExtensionCard'
import { AbrDailyAckPanel } from '../components/AbrDailyAckPanel'
import { CrewManagementPanel } from '../components/CrewManagementPanel'
import { ReplacePerformerPanel } from '../components/ReplacePerformerPanel'
import { WorkPermissionClosurePanel } from '../components/WorkPermissionClosurePanel'
import {
  PermitPackageBriefCard,
  type PackagePermissionBrief,
} from '../components/PermitPackageBrief'
import { DocumentKitSummary } from '../components/DocumentKitSummary'
import { userById } from '../demoUsers'
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
  isUserOnPermitCrew,
} from '../lib/permitAccess'
import { isPermitSigningRejected } from '../lib/permitRejectionDisplay'
import {
  restorePackageSessionFromPermit,
  resolvePackageResumeRoute,
} from '../lib/resumePermitPackage'
import {
  buildPackagePdf,
  buildPermitPackagePartPdf,
  preloadPackagePdfEngine,
  viewPackagePdf,
} from '../lib/buildPackagePdf'
import { buildPermitPackageBrief } from '../lib/permitPackageBrief'
import { buildWorkPermissionPdf } from '../lib/buildWorkPermissionPdf'
import { openPprAttachmentInBrowser } from '../lib/pprAttachment'
import { openPdfInBrowser } from '../lib/pdfPreview'
import { canUserInitiateWorkStop } from '../lib/inspectorAccess'
import { notifyWorkStopAlertsRefresh } from '../lib/refreshWorkStopAlerts'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { permissionNoticesForActivities } from '../lib/workPermissions'
import {
  signingRoleOrder,
  mergePermitAfterEgovSign,
  canSignRoleNow,
  approvalStepLabel,
  waitingHint,
} from '../lib/approvalSequence'
import { assigneeUidForRole } from '../lib/signatureStatus'
import { canUserRejectPermit, rejectionPatch } from '../lib/approvalActions'
import { resolveUserBadgeNo } from '../lib/userBadgeNumbers'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import { allCrewAcknowledged } from '../lib/crewAckComplete'
import { canUserSignCrewAck } from '../lib/crewAckEligibility'
import { provisionPermitSignersClient } from '../lib/provisionSigners'
import { canUserDeletePermit } from '../lib/permitDelete'
import {
  buildGodModePermitPatch,
  canUseGodMode,
  godModeSignPermitClient,
} from '../lib/godModeSign'
import {
  fillTemplate,
  formatSpecialWorkLabelsLocalized,
  roleLabel,
} from '../i18n/getLocale'
import type { PackagePdfPart } from '../lib/buildSigningPackagePdf'
import type { WorkStopPhoto } from '../types/workStop'
import type { WorkStopResolveAction } from '../lib/workStopFunctions'
import type { WorkPermissionKind } from '../types/workPermissions'
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
  } = useSession()
  const { t, language } = useLanguage()
  const dp = t.detailPage
  const df = t.detailForm
  const dk = t.docKit
  const c = t.common
  const journal = useJournal(id)
  const nav = useNavigate()
  const location = useLocation()
  const [workStopOpen, setWorkStopOpen] = useState(false)
  const [workStopBusy, setWorkStopBusy] = useState(false)
  const [closeBusy, setCloseBusy] = useState(false)
  const provisionWarning =
    (location.state as { provisionWarning?: string } | null)?.provisionWarning ?? null
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfPartBusy, setPdfPartBusy] = useState<PackagePdfPart | null>(null)
  const [viewingPermission, setViewingPermission] = useState<WorkPermissionKind | null>(null)
  const [gasTestFocus, setGasTestFocus] = useState<WorkPermissionKind | null>(null)

  useEffect(() => {
    preloadPackagePdfEngine()
  }, [])

  useEffect(() => {
    if (!gasTestFocus) return
    const el = document.getElementById(`ert-gas-${gasTestFocus}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [gasTestFocus])

  const permit = permits.find((p) => p.id === id)

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

  if (p.status === 'draft' && canUserSubmitPermitPackage(actor) && !isPermitSigningRejected(p)) {
    return (
      <div className="page">
        <p className="muted">{dp.openingDraft}</p>
      </div>
    )
  }

  if (
    actor.role === 'executor' &&
    (!isUserOnPermitCrew(p, actor.id) || p.status === 'draft')
  ) {
    return (
      <div className="page">
        <p>{dp.unavailable}</p>
        <Link to="/">{dp.backToList}</Link>
      </div>
    )
  }

  const row = matrixRow(p.category)

  function canUserSignRole(role: EgovSignRole): boolean {
    if (p.status !== 'on_approval') return false
    if (actor.role === 'coordinator') return canSignRoleNow(p, role)
    return actor.id === assigneeUidForRole(p, role) && canSignRoleNow(p, role)
  }

  async function runGodModeSign() {
    const label = p.registrationRefNo || p.title
    if (!window.confirm(fillTemplate(t.godMode.confirm, { label }))) return
    try {
      if (authMode === 'firebase') {
        const summary = await godModeSignPermitClient(p.id)
        if (!summary) throw new Error(t.godMode.failed)
        window.alert(
          fillTemplate(t.godMode.done, {
            crewSigned: summary.crewSigned,
            approversSigned: summary.approversSigned,
            skippedErt: summary.skippedErt,
          }),
        )
        await refresh()
      } else {
        const { patch, summary } = buildGodModePermitPatch(p, resolveUser, userDirectory)
        const merged = { ...p, ...patch }
        await updatePermit(p.id, {
          ...patch,
          ...issueStatusPatchIfApprovalsComplete(merged),
        })
        window.alert(
          fillTemplate(t.godMode.doneDemo, {
            crewSigned: summary.crewSigned,
            approversSigned: summary.approversSigned,
          }),
        )
      }
      notifySigningInvitesRefresh()
    } catch {
      window.alert(t.godMode.failed)
    }
  }

  const showApprovalFlow =
    p.status === 'on_approval' || isPermitSigningRejected(p)

  const showPdfSection = p.status !== 'draft' || !!p.packagePdf
  const packageBrief = buildPermitPackageBrief(p, resolveUser)
  const permissionBriefs: PackagePermissionBrief[] = (
    p.workPermissions?.documents ?? []
  ).map((doc) => ({
    kind: doc.kind,
    label: WORK_PERMISSION_BY_KIND[doc.kind].label,
    hasPdf: Boolean(doc.pdfBase64) || Boolean(doc.generatedAtIso),
    requiresGasTests: WORK_PERMISSION_BY_KIND[doc.kind].requiresGasTests,
  }))
  const docKitTemplates = permissionNoticesForActivities(p)
  const showWorkStopBtn =
    canUserInitiateWorkStop(p, actor.id) &&
    p.status !== 'closed' &&
    p.status !== 'archived' &&
    p.status !== 'annulled'

  async function viewPermitPdf() {
    setPdfBusy(true)
    try {
      const doc = await buildPackagePdf(p, resolveUser, userDirectory)
      viewPackagePdf(doc)
    } catch {
      window.alert(t.modals.pdfPackageFailed)
    } finally {
      setPdfBusy(false)
    }
  }

  async function viewPackagePart(part: PackagePdfPart) {
    setPdfPartBusy(part)
    try {
      const doc = await buildPermitPackagePartPdf(part, p, resolveUser, userDirectory)
      viewPackagePdf(doc)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setPdfPartBusy(null)
    }
  }

  async function viewPermissionPdf(kind: WorkPermissionKind) {
    const doc = p.workPermissions?.documents.find((d) => d.kind === kind)
    if (!doc) return
    setViewingPermission(kind)
    try {
      const base64 = doc.pdfBase64 ?? (await buildWorkPermissionPdf(doc)).base64
      openPdfInBrowser(base64, doc.title)
    } finally {
      setViewingPermission(null)
    }
  }

  function focusGasTest(kind: WorkPermissionKind) {
    setGasTestFocus((cur) => (cur === kind ? null : kind))
  }

  async function closePermitEarly() {
    if (!canUserTriggerStatus(p, 'closed', actor.role)) return
    if (!window.confirm(dp.closeEarlyConfirm)) return
    setCloseBusy(true)
    try {
      await transition(p.id, 'closed')
      if (authMode === 'firebase') await refresh()
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
      if (authMode === 'firebase') await refresh()
    } finally {
      setWorkStopBusy(false)
    }
  }

  async function handleResolveWorkStop(action: WorkStopResolveAction, comment: string) {
    setWorkStopBusy(true)
    try {
      await resolveWorkStop(p.id, action, comment)
      notifyWorkStopAlertsRefresh()
      if (authMode === 'firebase') await refresh()
    } finally {
      setWorkStopBusy(false)
    }
  }

  function canEditIssuerSign(): boolean {
    return (
      actor.role === 'coordinator' ||
      (actor.role === 'issuer' && actor.id === p.issuerUid)
    )
  }

  function canEditPermitterSign(): boolean {
    return (
      actor.role === 'coordinator' ||
      (actor.role === 'permitter' && actor.id === p.permitterUid)
    )
  }

  function canEditSafetyApproval(): boolean {
    return actor.role === 'coordinator' || actor.role === 'safety'
  }

  const locked = p.status === 'closed' || p.status === 'archived' || p.status === 'annulled'

  function canEditRetention(): boolean {
    if (locked) return false
    return actor.role === 'coordinator' || actor.role === 'issuer'
  }

  const signingRoles = signingRoleOrder(p)

  function canEditWorkFields(): boolean {
    if (locked) return false
    return (
      actor.role === 'coordinator' ||
      actor.role === 'issuer' ||
      actor.role === 'permitter' ||
      actor.role === 'performer'
    )
  }

  const actorInCrew = p.executors.some((ex) => ex.userUid === actor.id)

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
    if (!canUserRejectPermit(p, actor)) return false
    if (actor.role === 'coordinator') return canSignRoleNow(p, role)
    return actor.id === assigneeUidForRole(p, role) && canSignRoleNow(p, role)
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
    const nextExecutors = p.executors.map((ex) =>
      ex.userUid === sig.signedByUid
        ? { ...ex, briefingAcknowledged: true }
        : ex,
    )
    const nextCrewAck = {
      ...(p.crewAckSignatures ?? {}),
      [sig.signedByUid]: sig,
    }
    void updatePermit(p.id, {
      executors: nextExecutors,
      crewAckSignatures: {
        [sig.signedByUid]: sig,
      },
      ...issueStatusPatchIfApprovalsComplete({
        ...p,
        executors: nextExecutors,
        crewAckSignatures: nextCrewAck,
      }),
    }).then(async () => {
      notifySigningInvitesRefresh()
      if (
        authMode === 'firebase' &&
        allCrewAcknowledged({
          ...p,
          executors: nextExecutors,
          crewAckSignatures: nextCrewAck,
        })
      ) {
        await provisionPermitSignersClient(p.id)
        notifySigningInvitesRefresh()
      }
    })
    if (authMode === 'firebase') void refresh()
  }

  function canSignCrewAck(): boolean {
    return canUserSignCrewAck(p, actor.id, actor.role)
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

  return (
    <div className="page">
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

      <PermitEarlyCloseCard
        permit={p}
        actor={actor}
        busy={closeBusy}
        onClose={() => void closePermitEarly()}
      />

      <PermitExtensionCard permit={p} actor={actor} />

      <CrewManagementPanel permit={p} actor={actor} />

      <ReplacePerformerPanel permit={p} actor={actor} />

      <AbrDailyAckPanel permit={p} actor={actor} />

      <WorkStopStatusBanner permit={p} userId={actor.id} />
      <InspectorWorkStopPanel
        permit={p}
        actor={actor}
        busy={workStopBusy}
        onResolve={(action, comment) => void handleResolveWorkStop(action, comment)}
      />
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

      {showPdfSection ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>{dk.approvalPackage}</h2>
          {docKitTemplates.length > 0 ? (
            <DocumentKitSummary templates={docKitTemplates} />
          ) : null}
          <PermitPackageBriefCard
            brief={packageBrief}
            permissions={permissionBriefs}
            showGasTestTasks={actor.role === 'ert'}
            activeGasKind={gasTestFocus}
            onViewPart={(part) => void viewPackagePart(part)}
            onViewPpr={
              p.ppr?.attachment
                ? () => {
                    openPprAttachmentInBrowser(p.ppr!.attachment!)
                  }
                : undefined
            }
            onViewPermission={(kind) => void viewPermissionPdf(kind)}
            onGasTestTask={focusGasTest}
            viewingPart={pdfPartBusy}
            viewingPermission={viewingPermission}
          />
          <button
            type="button"
            className="btn primary small"
            style={{ marginTop: '0.75rem' }}
            disabled={pdfBusy}
            onClick={() => void viewPermitPdf()}
          >
            {pdfBusy ? c.opening : dp.viewFullPdf}
          </button>
        </section>
      ) : null}

      {actor.role === 'permitter' && p.workPermissions?.documents?.length ? (
        <PermitterPreWorkLivePanel
          permit={p}
          actor={actor}
          updatePermit={updatePermit}
          resolveUser={resolveUser}
          userDirectory={userDirectory}
          refresh={refresh}
        />
      ) : null}

      {actor.role === 'ert' && p.workPermissions?.documents?.length ? (
        <ErtGasTestLivePanel
          permit={p}
          actor={actor}
          updatePermit={updatePermit}
          resolveUser={resolveUser}
          userDirectory={userDirectory}
          focusKind={gasTestFocus}
        />
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

      {actor.role === 'executor' && actorInCrew && showApprovalFlow ? (
        <section className="card" id="crew-ack-section">
          <h2 style={{ marginTop: 0 }}>{t.approval.crewSection}</h2>
          <CrewAckSignRow
            permit={p}
            actor={actor}
            canSign={canSignCrewAck()}
            onSigned={saveCrewAck}
          />
        </section>
      ) : null}

      {actor.role !== 'executor' && showApprovalFlow ? (
        <>
          <PermitOnApprovalSummary
            permit={p}
            resolveUser={resolveUser}
            crewAckAction={
              canSignCrewAck() ? (
                <CrewAckSignRow
                  permit={p}
                  actor={actor}
                  canSign={canSignCrewAck()}
                  onSigned={saveCrewAck}
                />
              ) : undefined
            }
          />

          <section className="card" id="signatures-section">
            <h2 style={{ marginTop: 0 }}>{t.signing.signaturesTitle}</h2>
            <p className="small muted" style={{ marginTop: 0 }}>
              {t.detail.signViaEgov}
            </p>
            <div className="egov-sign-list">
              {signingRoles.map((role) => (
                <EgovSignatureRoleRow
                  key={role}
                  permit={p}
                  role={role}
                  actor={actor}
                  canSign={canUserSignRole(role)}
                  stepTitle={approvalStepLabel(role, p, resolveUser)}
                  waitingMessage={waitingHint(p, role, resolveUser)}
                  canReject={canRejectAs(role)}
                  onReject={() => void rejectPermit()}
                  onSaveSignature={(sig) => saveEgovSignature(role, sig)}
                  resolveUser={resolveUser}
                />
              ))}
            </div>
          </section>

          {canUseGodMode(actor) && p.status === 'on_approval' ? (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>{t.godMode.title}</h2>
              <p className="small muted" style={{ marginTop: 0 }}>
                {t.godMode.descriptionIntro} {t.godMode.descriptionWorkers}{' '}
                {t.godMode.descriptionAck} {t.godMode.descriptionApprovers}{' '}
                {t.godMode.descriptionApproversList} {t.godMode.descriptionExcluded}
              </p>
              <button type="button" className="btn ghost small" onClick={() => void runGodModeSign()}>
                {t.godMode.signLatest}
              </button>
            </section>
          ) : null}
        </>
      ) : null}

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

        <section className="card">
          <h2>Матрица (кат. {permit.category})</h2>
          <p className="small muted">
            Документы: {row.requiredDocuments.join(', ')}
          </p>
          <p className="small muted">
            Базовый срок: {row.defaultValidityDays} дн.
          </p>
        </section>
      </div>

      {actor.role !== 'executor' && (
      <>
      <section className="card" id="signatures-section">
        <h2>Подписи и согласования</h2>
        <p className="small muted" style={{ marginTop: 0 }}>
          Производитель работ (1-й) инициирует переход статусов; подпись
          допускающего, выдающего и при необходимости утверждающего НД ставятся
          соответствующими учётными записями.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={permit.signatures.issuerSigned}
            disabled={!canEditIssuerSign()}
            onChange={(e) =>
              void updatePermit(permit.id, {
                signatures: {
                  ...permit.signatures,
                  issuerSigned: e.target.checked,
                },
              })
            }
          />
          Подпись выдающего (может отметить: выдающий или координатор)
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={permit.signatures.permitterSigned}
            disabled={!canEditPermitterSign()}
            onChange={(e) =>
              void updatePermit(permit.id, {
                signatures: {
                  ...permit.signatures,
                  permitterSigned: e.target.checked,
                },
              })
            }
          />
          Подпись допускающего
        </label>
        {permit.isContractorPermit && (
          <label className="check">
            <input
              type="checkbox"
              checked={permit.contractorSafetyApproved}
              disabled={!canEditSafetyApproval()}
              onChange={(e) =>
                void updatePermit(permit.id, {
                  contractorSafetyApproved: e.target.checked,
                })
              }
            />
            Согласовано ОТ/ТБ (MVP-B)
          </label>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={p.incidentLongRetention}
            disabled={!canEditRetention()}
            onChange={(e) =>
              void updatePermit(p.id, {
                incidentLongRetention: e.target.checked,
              })
            }
          />
          Длительное хранение копии (инцидент / 45 лет по процедуре)
        </label>
      </section>

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
