import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PermitPhotoCapture } from '../components/PermitPhotoCapture'
import { ToolsAndEquipmentField } from '../components/ToolsAndEquipmentField'
import { WorkActivitiesField } from '../components/WorkActivitiesField'
import {
  enrichUserDirectoryWithDefaultSigners,
  resolveDefaultNdprParticipantUids,
  resolveNdprSignerUid,
} from '../config/defaultNdprSigners'
import { useLanguage } from '../context/LanguageContext'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { fillTemplate } from '../i18n/getLocale'
import { addOneCalendarMonthFromStart } from '../lib/calendarMonth'
import {
  normalizeDatetimeLocalInput,
  toDatetimeLocalInput,
} from '../lib/datetimeLocal'
import {
  mergeEnsuredWorkersIntoDirectory,
  ensureDefaultWorkersClient,
} from '../lib/ensureDefaultWorkers'
import {
  ensureDefaultNdprSignersClient,
  type EnsureDefaultSignerAccount,
} from '../lib/ensureDefaultNdprSigners'
import { executorAccountsConflict, hasAvailableWorkerForCrew, workerChoicesForRow } from '../lib/directoryUsers'
import { isNdGatePassed, setNdGatePassed } from '../lib/ndGate'
import {
  mergePreparedNdprDraftForSession,
  restoreNewPermitDraftFromSession,
  saveNewPermitDraftToSession,
} from '../lib/newPermitDraftAutosave'
import { clearPackageSession, PACKAGE_CLEARED_EVENT, isNdprManualFillMode, setNdprManualFillMode } from '../lib/packageSession'
import { shouldAutofillNdprFromPpr } from '../lib/ndprManualFill'
import { clearResumePermitId } from '../lib/resumePermitPackage'
import { resolvePerformerUidForPackage } from '../lib/permitAccess'
import {
  loadPprForm,
  pprHasNdprSource,
  savePprForm,
} from '../lib/pprAutosave'
import { isPprGatePassed } from '../lib/pprGate'
import { mergePermitDraftWithPpr } from '../lib/pprNdprExtract'
import { nextBadgeNumberForPerformer } from '../lib/registrationNumber'
import { resolvePprForNdpr } from '../lib/resolvePprForNdpr'
import { resolveExecutorRows } from '../lib/resolveWorkerUid'
import { resolveUserBadgeNo } from '../lib/userBadgeNumbers'
import { permitRequiresErtApproval } from '../lib/fireWorkApproval'
import {
  permissionNoticesForActivities,
} from '../lib/workPermissions'
import {
  MIN_NDPR_EXECUTORS,
  prepareNdprDraftForValidation,
  validateNdprDraft,
} from '../lib/validateNdprDraft'
import type { DemoUser, PermitDraft, UserRole } from '../types/domain'
import {
  applyWorkActivitiesToDraft,
  ZONE_CLASS_LABELS,
  type ZoneClass,
} from '../types/domain'
import { emptyPermitDraft } from '../uog/permitDefaults'
import '../ndpr-page.css'

const NDPR_SLOT_ROLES = {
  performer: ['performer'],
  permitter: ['permitter', 'coordinator'],
  issuer: ['issuer', 'coordinator'],
  leadExpert: ['leadExpert'],
  ert: ['ert'],
} as const satisfies Record<string, UserRole[]>

type NdprSlot = keyof typeof NDPR_SLOT_ROLES

function uid() {
  return crypto.randomUUID()
}

function usersForNdprSlot(
  directory: DemoUser[],
  slot: NdprSlot,
  currentUid: string,
): DemoUser[] {
  const roles = NDPR_SLOT_ROLES[slot]
  const pool = directory.filter((u) =>
    (roles as readonly UserRole[]).includes(u.role),
  )
  const current = directory.find((u) => u.id === currentUid)
  if (current && !pool.some((u) => u.id === current.id)) {
    return [current, ...pool]
  }
  return pool.length > 0 ? pool : directory
}

function loadInitialPermitDraft(): PermitDraft {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('fresh') === '1') {
      clearPackageSession()
      return emptyPermitDraft()
    }
    const fromPpr = params.get('from') === 'ppr'
    const manual = params.get('manual') === '1'
    if (isNdprManualFillMode()) {
      if (fromPpr && manual) return emptyPermitDraft()
      return restoreNewPermitDraftFromSession()
    }
    if (fromPpr && manual) {
      return emptyPermitDraft()
    }
    const base = fromPpr ? emptyPermitDraft() : restoreNewPermitDraftFromSession()
    const ppr = loadPprForm()
    let draft = shouldAutofillNdprFromPpr(ppr)
      ? mergePermitDraftWithPpr(base, ppr)
      : base
    if (fromPpr) {
      clearResumePermitId()
      draft = { ...draft, executors: [] }
    }
    return draft
  } catch {
    return emptyPermitDraft()
  }
}

export function NewPermitPage() {
  const { authMode, userDirectory, user, permits } = useSession()
  const { showError } = useToast()
  const { t } = useLanguage()
  const pages = t.pages
  const ndprPage = t.ndprPage
  const ndprForm = t.ndprForm
  const branding = t.branding
  const common = t.common
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState<PermitDraft>(() => loadInitialPermitDraft())
  const [signerAccounts, setSignerAccounts] = useState<EnsureDefaultSignerAccount[]>([])
  const [workerAccounts, setWorkerAccounts] = useState<
    Awaited<ReturnType<typeof ensureDefaultWorkersClient>>
  >([])
  const participantsSeeded = useRef(false)
  const pprEnriched = useRef(false)
  const skipSaveRef = useRef(false)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const participantsRef = useRef<HTMLDivElement>(null)

  function resetDraft() {
    skipSaveRef.current = true
    participantsSeeded.current = false
    pprEnriched.current = false
    setDraft(emptyPermitDraft())
    window.queueMicrotask(() => {
      skipSaveRef.current = false
    })
  }

  useEffect(() => {
    if (searchParams.get('fresh') !== '1') return
    participantsSeeded.current = false
    const sp = new URLSearchParams(searchParams)
    sp.delete('fresh')
    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useLayoutEffect(() => {
    if (searchParams.get('from') !== 'ppr') return
    participantsSeeded.current = false
    window.scrollTo({ top: 0, behavior: 'instant' in window ? ('instant' as ScrollBehavior) : 'auto' })
    const sp = new URLSearchParams(searchParams)
    sp.delete('from')
    sp.delete('manual')
    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  const directory = useMemo(() => {
    let list = enrichUserDirectoryWithDefaultSigners(userDirectory)
    if (signerAccounts.length > 0) {
      for (const account of signerAccounts) {
        const existing = list.find((u) => u.id === account.uid)
        if (existing) continue
        list = [
          ...list,
          {
            id: account.uid,
            displayName: account.displayName,
            email: account.email,
            role: account.role as UserRole,
            badgeNo: account.badgeNo,
          },
        ]
      }
    }
    if (workerAccounts?.length) {
      list = mergeEnsuredWorkersIntoDirectory(list, workerAccounts)
    }
    return list
  }, [userDirectory, signerAccounts, workerAccounts])

  useEffect(() => {
    if (authMode !== 'firebase' || (!isPprGatePassed() && !pprHasNdprSource(loadPprForm()))) {
      return
    }
    let cancelled = false
    void Promise.all([ensureDefaultNdprSignersClient(), ensureDefaultWorkersClient()])
      .then(([signers, workers]) => {
        if (cancelled) return
        if (signers?.accounts?.length) {
          setSignerAccounts(signers.accounts)
          participantsSeeded.current = false
        }
        if (workers?.length) {
          setWorkerAccounts(workers)
          participantsSeeded.current = false
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authMode])

  useEffect(() => {
    if (directory.length === 0) return
    const ppr = loadPprForm()
    if (!shouldAutofillNdprFromPpr(ppr) || participantsSeeded.current) {
      return
    }
    participantsSeeded.current = true
    const defaults = resolveDefaultNdprParticipantUids(directory)
    setDraft((d) => {
      const performerUid = resolvePerformerUidForPackage(
        resolveNdprSignerUid(directory, 'performer', d.performerUid) ||
          defaults.performerUid,
        user,
        directory,
      )
      const badgeNo =
        resolveUserBadgeNo(performerUid, directory) ||
        nextBadgeNumberForPerformer(permits, performerUid)
      return {
        ...d,
        performerUid,
        permitterUid:
          resolveNdprSignerUid(directory, 'permitter', d.permitterUid) ||
          defaults.permitterUid,
        issuerUid:
          resolveNdprSignerUid(directory, 'issuer', d.issuerUid) || defaults.issuerUid,
        leadExpertUid:
          resolveNdprSignerUid(directory, 'leadExpert', d.leadExpertUid) ||
          defaults.leadExpertUid,
        ertUid: permitRequiresErtApproval(d) ? d.ertUid?.trim() || undefined : undefined,
        executors: resolveExecutorRows(d.executors, directory),
        f02: {
          ...d.f02,
          badgeNo: d.f02.badgeNo.trim() || badgeNo,
        },
        registrationRefNo: d.registrationRefNo.trim() || '',
      }
    })
  }, [directory, permits, user?.id, user?.role])

  useEffect(() => {
    if (directory.length === 0) return
    if (!shouldAutofillNdprFromPpr()) return
    setDraft((d) => {
      const next = resolveExecutorRows(d.executors, directory)
      if (next.some((row, i) => row.userUid !== d.executors[i]?.userUid)) {
        return { ...d, executors: next }
      }
      return d
    })
  }, [directory])

  useEffect(() => {
    if (user?.role !== 'performer' || directory.length === 0) return
    if (!shouldAutofillNdprFromPpr()) return
    setDraft((d) => {
      const performerUid = resolvePerformerUidForPackage(d.performerUid, user, directory)
      const badgeNo = resolveUserBadgeNo(performerUid, directory)
      const today = new Date().toISOString().slice(0, 10)
      const nextF02 = { ...d.f02 }
      if (badgeNo && nextF02.badgeNo !== badgeNo) nextF02.badgeNo = badgeNo
      if (!nextF02.startDate.trim()) {
        const startDate = `${today}T08:00`
        nextF02.startDate = startDate
        nextF02.endDate = addOneCalendarMonthFromStart(startDate)
      }
      const performerChanged = performerUid !== d.performerUid
      const f02Changed =
        nextF02.badgeNo !== d.f02.badgeNo ||
        nextF02.startDate !== d.f02.startDate ||
        nextF02.endDate !== d.f02.endDate
      if (!performerChanged && !f02Changed) return d
      return { ...d, performerUid, f02: nextF02 }
    })
  }, [user?.id, user?.role, directory])

  useEffect(() => {
    if (pprEnriched.current) return
    const ppr = loadPprForm()
    if (!shouldAutofillNdprFromPpr(ppr)) return
    pprEnriched.current = true
    void resolvePprForNdpr(ppr).then(({ ppr: enriched, docText }) => {
      savePprForm(enriched)
      setDraft((d) => {
        const merged = mergePermitDraftWithPpr(d, enriched, { docText })
        if (d.workStages.trim()) {
          return {
            ...merged,
            workStages: d.workStages,
            title: d.title.trim() || merged.title,
          }
        }
        return merged
      })
    })
  }, [])

  useEffect(() => {
    function onPackageCleared() {
      resetDraft()
    }
    window.addEventListener(PACKAGE_CLEARED_EVENT, onPackageCleared)
    return () => window.removeEventListener(PACKAGE_CLEARED_EVENT, onPackageCleared)
  }, [])

  useEffect(() => {
    if (skipSaveRef.current) return
    const t = window.setTimeout(() => {
      if (!skipSaveRef.current) saveNewPermitDraftToSession(draft)
    }, 300)
    return () => {
      window.clearTimeout(t)
      if (!skipSaveRef.current) saveNewPermitDraftToSession(draftRef.current)
    }
  }, [draft])

  const preparedDraft = useMemo(
    () => prepareNdprDraftForValidation(draft, user, directory),
    [draft, user, directory],
  )

  const permissionTemplates = useMemo(
    () => permissionNoticesForActivities(preparedDraft),
    [preparedDraft],
  )

  const manualFill = isNdprManualFillMode() || !pprHasNdprSource(loadPprForm())
  const f02 = draft.f02
  const isProducer = user?.role === 'performer'

  const canAddWorker = useMemo(
    () => hasAvailableWorkerForCrew(directory, draft.executors),
    [draft.executors, directory],
  )

  function addExecutor() {
    if (!canAddWorker) return
    const row = {
      id: uid(),
      userUid: '',
      dateIso: new Date().toISOString().slice(0, 10),
      briefingAcknowledged: false,
    }
    setDraft((d) => ({ ...d, executors: [row, ...d.executors] }))
  }

  function patchExecutor(id: string, patch: Partial<(typeof draft.executors)[number]>) {
    setDraft((d) => ({
      ...d,
      executors: d.executors.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }))
  }

  function removeExecutor(id: string) {
    setDraft((d) => ({
      ...d,
      executors: d.executors.filter((x) => x.id !== id),
    }))
  }

  function submitNdpr(e: React.FormEvent) {
    e.preventDefault()
    const current = draftRef.current
    const prepared = prepareNdprDraftForValidation(current, user, directory)
    const err = validateNdprDraft(prepared)
    if (err) {
      showError(err)
      return
    }
    const activeUids = prepared.executors.map((ex) => ex.userUid).filter(Boolean)
    for (let i = 0; i < activeUids.length; i += 1) {
      for (let j = i + 1; j < activeUids.length; j += 1) {
        if (executorAccountsConflict(activeUids[i]!, activeUids[j]!, directory)) {
          showError(ndprPage.duplicateWorker)
          return
        }
      }
    }
    saveNewPermitDraftToSession(
      mergePreparedNdprDraftForSession(current, prepared),
    )
    setNdprManualFillMode(false)
    setNdGatePassed()
    nav('/risk-assessment')
  }

  if (!isPprGatePassed()) {
    return (
      <div className="page narrow">
        <h1>{pages.ndprTitle}</h1>
        <p className="muted">{pages.ndprGatePpr}</p>
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <Link className="btn primary" to="/ppr">
            {branding.sourceDocument}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page narrow ndpr-page-top">
      <div className="page-header">
        <div>
          <h1>{pages.ndprTitle}</h1>
          <p className="muted small" style={{ marginTop: '-0.25rem' }}>
            {pages.ndprStep2}
          </p>
        </div>
        <div className="btn-row page-header__cta">
          <Link className="btn ghost small" to="/ppr">
            {branding.sourceDocument}
          </Link>
          {isNdGatePassed() ? (
            <Link className="btn ghost small" to="/risk-assessment">
              {t.nav.risk}
            </Link>
          ) : (
            <span
              className="btn ghost small"
              style={{ opacity: 0.45, pointerEvents: 'none' }}
              title={ndprPage.fillNdprFirst}
            >
              {t.nav.risk}
            </span>
          )}
        </div>
      </div>

      <form className="card form" onSubmit={submitNdpr} noValidate>
        <fieldset className="fieldset ndpr-meta-fields">
          <legend>{ndprForm.sourceDataLegend}</legend>
          <p className="small muted" style={{ marginTop: 0 }}>
            {manualFill ? ndprPage.manualFillHint : ndprPage.autoFillHint}
          </p>
          <label>
            {ndprForm.organization}
            <input
              required
              value={f02.company}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  f02: { ...f02, company: e.target.value },
                })
              }
            />
          </label>
          <label>
            {ndprForm.siteLocation}
            <input
              required
              value={draft.siteName}
              onChange={(e) => setDraft({ ...draft, siteName: e.target.value })}
            />
          </label>
          <WorkActivitiesField
            activities={draft.specialWorkActivities}
            requiredPermissions={permissionTemplates}
            onChange={(activities) =>
              setDraft((d) => applyWorkActivitiesToDraft(d, activities))
            }
          />
          <label>
            {ndprForm.zoneClassification}
            <select
              required
              value={draft.zoneClass}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  zoneClass: Number(e.target.value) as ZoneClass,
                })
              }
            >
              {([1, 2, 3] as const).map((z) => (
                <option key={z} value={z}>
                  {ZONE_CLASS_LABELS[z]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <label>
          {ndprForm.workTitle}
          <input
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>

        <label>
          {ndprForm.workStages}
          <textarea
            required
            rows={14}
            value={draft.workStages}
            onChange={(e) => setDraft({ ...draft, workStages: e.target.value })}
            placeholder={ndprForm.workStagesPlaceholder}
          />
        </label>

        <ToolsAndEquipmentField
          required
          value={draft.toolsAndEquipment}
          onChange={(toolsAndEquipment) =>
            setDraft({ ...draft, toolsAndEquipment })
          }
        />

        <div ref={participantsRef} className="ndpr-participants-scroll-target">
          <fieldset className="fieldset">
            <legend>{ndprForm.participantsLegend}</legend>
            <p className="small muted" style={{ marginTop: 0 }}>
              {ndprForm.participantsHint}
            </p>
            {permitRequiresErtApproval(draft) ? (
              <p className="small muted" style={{ marginTop: 0 }}>
                {ndprForm.ertApproverNote}
              </p>
            ) : null}
            <label>
              {ndprForm.signer1Performer}
              <select
                required
                value={draft.performerUid}
                onChange={(e) => {
                  const performerUid = e.target.value
                  const badgeNo = resolveUserBadgeNo(performerUid, directory)
                  setDraft({
                    ...draft,
                    performerUid,
                    f02: { ...f02, badgeNo: badgeNo || f02.badgeNo },
                  })
                }}
              >
                <option value="">{ndprForm.selectPlaceholder}</option>
                {usersForNdprSlot(directory, 'performer', draft.performerUid).map(
                  (u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {ndprForm.signer2Permitter}
              <select
                required
                value={draft.permitterUid}
                onChange={(e) =>
                  setDraft({ ...draft, permitterUid: e.target.value })
                }
              >
                <option value="">{ndprForm.selectPlaceholder}</option>
                {usersForNdprSlot(directory, 'permitter', draft.permitterUid).map(
                  (u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {ndprForm.signer3Issuer}
              <select
                required
                value={draft.issuerUid}
                onChange={(e) => setDraft({ ...draft, issuerUid: e.target.value })}
              >
                <option value="">{ndprForm.selectPlaceholder}</option>
                {usersForNdprSlot(directory, 'issuer', draft.issuerUid).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {ndprForm.signer4LeadExpert}
              <select
                required
                value={draft.leadExpertUid}
                onChange={(e) =>
                  setDraft({ ...draft, leadExpertUid: e.target.value })
                }
              >
                <option value="">{ndprForm.selectPlaceholder}</option>
                {usersForNdprSlot(directory, 'leadExpert', draft.leadExpertUid).map(
                  (u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ),
                )}
              </select>
            </label>
            {permitRequiresErtApproval(draft) ? (
              <label>
                {ndprForm.signer5Ert}
                <select
                  required
                  value={draft.ertUid ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, ertUid: e.target.value })
                  }
                >
                  <option value="">{ndprForm.selectPlaceholder}</option>
                  {usersForNdprSlot(directory, 'ert', draft.ertUid ?? '').map(
                    (u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ) : null}
          </fieldset>
        </div>

        {!isProducer ? (
        <fieldset className="fieldset">
          <legend>{ndprForm.f02Legend}</legend>
          <div className="row">
            <label>
              {ndprForm.badgeNo}
              <input
                value={f02.badgeNo}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    f02: { ...f02, badgeNo: e.target.value },
                  })
                }
              />
            </label>
            <label>
              {ndprForm.shift}
              <select
                value={f02.shift}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    f02: { ...f02, shift: e.target.value as typeof f02.shift },
                  })
                }
              >
                <option value="">—</option>
                <option value="day">{ndprForm.shiftDay}</option>
                <option value="night">{ndprForm.shiftNight}</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              {ndprForm.startDateTime}
              <input
                type="datetime-local"
                value={toDatetimeLocalInput(f02.startDate)}
                onChange={(e) => {
                  const startDate = normalizeDatetimeLocalInput(e.target.value)
                  setDraft({
                    ...draft,
                    f02: {
                      ...f02,
                      startDate,
                      endDate: startDate
                        ? addOneCalendarMonthFromStart(startDate)
                        : f02.endDate,
                    },
                  })
                }}
              />
            </label>
            <label>
              {ndprForm.endDateTime}
              <input
                type="datetime-local"
                value={toDatetimeLocalInput(f02.endDate)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    f02: {
                      ...f02,
                      endDate: normalizeDatetimeLocalInput(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </fieldset>
        ) : null}

        <fieldset className="fieldset ndpr-workers-fieldset">
          <legend>{ndprForm.workersLegend}</legend>
          {isProducer ? (
            <p className="small muted" style={{ marginTop: 0 }}>
              {fillTemplate(ndprForm.workersProducerHint, { min: MIN_NDPR_EXECUTORS })}
            </p>
          ) : null}
          {draft.executors.length === 0 ? (
            <p className="small muted" style={{ marginTop: 0 }}>
              {fillTemplate(ndprForm.workersEmptyHint, { min: MIN_NDPR_EXECUTORS })}
            </p>
          ) : null}
          {draft.executors.map((ex) => (
            <div key={ex.id} className="ndpr-worker-row">
              <label>
                {ndprForm.fromUserList}
                <select
                  value={ex.userUid}
                  onChange={(e) => patchExecutor(ex.id, { userUid: e.target.value })}
                >
                  <option value="">{ndprForm.selectPlaceholder}</option>
                  {workerChoicesForRow(directory, draft.executors, ex.id).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </label>
              {!isProducer ? (
                <label>
                  {ndprForm.date}
                  <input
                    type="date"
                    value={ex.dateIso}
                    onChange={(e) => patchExecutor(ex.id, { dateIso: e.target.value })}
                  />
                </label>
              ) : null}
              <button
                type="button"
                className="btn ghost small ndpr-worker-row__remove"
                onClick={() => removeExecutor(ex.id)}
              >
                {ndprForm.removeWorker}
              </button>
            </div>
          ))}
          <div className="ndpr-workers-fieldset__add">
            <button
              type="button"
              className="btn ghost"
              onClick={addExecutor}
              disabled={!canAddWorker}
              title={!canAddWorker ? common.noWorkersAvailable : ''}
            >
              {ndprForm.addWorker}
            </button>
          </div>
        </fieldset>

        <PermitPhotoCapture
          photos={draft.sitePhotos ?? []}
          onChange={(sitePhotos) => setDraft({ ...draft, sitePhotos })}
        />

        <div className="actions">
          <button type="submit" className="btn primary">
            {ndprForm.createButton}
          </button>
        </div>
      </form>
    </div>
  )
}
