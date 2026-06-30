import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { finalizeAsorFormForReady } from '../lib/finalizeGeneratedRiskDocs'
import { applyAsorToPermitDraft } from '../lib/asorPrefill'
import { seedApprovalNamesFromPermit } from '../lib/approvalSequence'
import { isNdGatePassed, setNdGatePassed, clearNdGate } from '../lib/ndGate'
import { isPprGatePassed } from '../lib/pprGate'
import { loadPprForm } from '../lib/pprAutosave'
import { openPprAttachmentInBrowser } from '../lib/pprAttachment'
import { prefillAsorTeamFromNd } from '../lib/pprAsorPrefill'
import { restoreNewPermitDraftFromSession } from '../lib/newPermitDraftAutosave'
import { clearPackageSession, PACKAGE_CLEARED_EVENT } from '../lib/packageSession'
import {
  ensurePermitForPackageSubmit,
} from '../lib/submitNdprPackageFlow'
import { setRiskGatePassed } from '../lib/riskGate'
import {
  initializeWorkPermissionsBundle,
  requiresWorkPermissions,
  wizardStepCount,
} from '../lib/workPermissions'
import { saveWorkPermissionsToSession } from '../lib/workPermissionsAutosave'
import { preloadPackagePdfEngine } from '../lib/buildPackagePdf'
import { applyNeboshAssessmentToAsor } from '../lib/applyNeboshAssessmentToAsor'
import { buildAbrPdf } from '../lib/buildAbrPdf'
import { buildNeboshRiskPdf } from '../lib/buildNeboshRiskPdf'
import { openPdfInBrowser, pdfTabTitleFromFileName } from '../lib/pdfPreview'
import { generateAbrFromPpr, isAbrAiAvailable } from '../lib/generateAbrFromPpr'
import {
  applyAbrHeaderFromPprNd,
  mergeAbrPeopleFromNd,
  prefillAbrPeopleFromNd,
} from '../lib/prefillAbrFromPackage'
import { mergeNeboshApprovalPeopleFromNd } from '../lib/ndprApprovalPeople'
import {
  generateNeboshRiskAssessmentFromPpr,
  isNeboshAiAvailable,
} from '../lib/generateNeboshRiskAssessment'
import { AbrManualReview } from '../components/AbrManualReview'
import { LoadingProgress } from '../components/LoadingProgress'
import { NeboshManualReview } from '../components/NeboshManualReview'
import { ABR_LABEL, APP_NAME, SOURCE_DOCUMENT_LABEL } from '../config/branding'
import { useLanguage } from '../context/LanguageContext'
import { resolveUserBadgeNo } from '../lib/userBadgeNumbers'
import { enrichParticipantDirectory } from '../lib/resolveDirectoryPerson'
import { validateAsorForm, isRiskAssessmentReady, isAbrReady } from '../lib/validateAsorForm'
import {
  canUserSubmitPermitPackage,
  resolvePerformerUidForPackage,
  submitPermitPackageDeniedReason,
} from '../lib/permitAccess'
import { getPackageSubmitRequirements } from '../lib/packageSubmitRequirements'
import {
  prepareNdprDraftForValidation,
  validateNdprDraft,
} from '../lib/validateNdprDraft'
import type { AsorForm } from '../types/asor'
import type { AbrForm } from '../types/abr'
import { emptyAbrForm } from '../types/abr'
import { ASOR_EDITOR_AUTOSAVE_KEY, emptyAsorForm } from '../types/asor'
import '../risk-assessment-page.css'
import {
  buildManualRiskAssessmentForm,
  ensureManualRiskScaffold,
  loadRiskAssessmentForm,
} from '../lib/initRiskAssessmentForm'

type RiskSectionMode = 'manual' | 'generate'

export function RiskAssessmentPage() {
  const nav = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const p = t.pages
  const rp = t.riskPage
  const { createPermit, updatePermit, transition, resolveUser, user, userDirectory } = useSession()
  const { showError } = useToast()
  const [form, setForm] = useState<AsorForm>(() => emptyAsorForm())
  const [boot, setBoot] = useState(true)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitStage, setSubmitStage] = useState<string | null>(null)
  const [abrPdfBusy, setAbrPdfBusy] = useState(false)
  const [abrGenBusy, setAbrGenBusy] = useState(false)
  const [abrGenError, setAbrGenError] = useState<string | null>(null)
  const [abrGenNote, setAbrGenNote] = useState<string | null>(null)
  const [neboshPdfBusy, setNeboshPdfBusy] = useState(false)
  const [neboshGenBusy, setNeboshGenBusy] = useState(false)
  const [neboshGenError, setNeboshGenError] = useState<string | null>(null)
  const [neboshGenNote, setNeboshGenNote] = useState<string | null>(null)
  const [manualReviewConfirmed, setManualReviewConfirmed] = useState(false)
  const [abrSectionMode, setAbrSectionMode] = useState<RiskSectionMode>('manual')
  const [riskSectionMode, setRiskSectionMode] = useState<RiskSectionMode>('manual')
  const [abrReviewOpen, setAbrReviewOpen] = useState(false)
  const [neboshReviewOpen, setNeboshReviewOpen] = useState(false)
  const suppressAutosaveRef = useRef(false)

  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, userDirectory)

  const participantDirectory = useMemo(
    () => enrichParticipantDirectory(userDirectory),
    [userDirectory],
  )

  const neboshHazardCount = form.tasks.reduce((n, t) => n + t.hazards.length, 0)
  const abrReady = isAbrReady(form)
  const neboshReady = isRiskAssessmentReady(form)
  const maySubmitPackage = canUserSubmitPermitPackage(user)
  const ndDraft = useMemo(
    () =>
      prepareNdprDraftForValidation(
        restoreNewPermitDraftFromSession(),
        user,
        participantDirectory,
      ),
    [user, participantDirectory, location.key],
  )
  const ndprAccessible = useMemo(
    () => validateNdprDraft(ndDraft) === null,
    [ndDraft],
  )

  const submitRequirements = useMemo(
    () =>
      getPackageSubmitRequirements({
        user,
        form,
        manualReviewConfirmed,
        ndDraft,
      }),
    [user, form, manualReviewConfirmed, ndDraft],
  )
  const permissionsRequired = requiresWorkPermissions(ndDraft)
  const wizardSteps = wizardStepCount(ndDraft)
  const canProceedRisk =
    maySubmitPackage &&
    abrReady &&
    neboshReady &&
    manualReviewConfirmed &&
    !busy &&
    submitRequirements.every((r) => r.ok)
  const canSubmit = canProceedRisk

  const pprAttachment = useMemo(() => loadPprForm().attachment, [ndDraft.title])

  useEffect(() => {
    preloadPackagePdfEngine()
  }, [])

  useEffect(() => {
    const nd = prepareNdprDraftForValidation(
      restoreNewPermitDraftFromSession(),
      user,
      participantDirectory,
    )
    const ppr = loadPprForm()
    const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
    const saved = loadRiskAssessmentForm()
    const base =
      saved ??
      buildManualRiskAssessmentForm(nd, ppr, resolveName, (uid) =>
        resolveUserBadgeNo(uid, userDirectory),
      )
    setForm(
      ensureManualRiskScaffold(
        base,
        nd,
        ppr,
        resolveName,
        (uid) => resolveUserBadgeNo(uid, userDirectory),
      ),
    )
    setBoot(false)
  }, [])

  useEffect(() => {
    if (boot) return
    const prepared = prepareNdprDraftForValidation(
      restoreNewPermitDraftFromSession(),
      user,
      participantDirectory,
    )
    if (validateNdprDraft(prepared)) {
      clearNdGate()
    } else {
      setNdGatePassed()
    }
  }, [boot, participantDirectory, user?.id, user?.role])

  useEffect(() => {
    if (boot || suppressAutosaveRef.current) return
    try {
      sessionStorage.setItem(ASOR_EDITOR_AUTOSAVE_KEY, JSON.stringify(form))
    } catch {
      /* ignore quota */
    }
  }, [form, boot])

  async function generateAbrFromPprDoc() {
    const ppr = loadPprForm()
    if (!ppr.controlMeasures?.items.length && !ppr.workStagesText.trim()) {
      setAbrGenError(`Сначала загрузите ${SOURCE_DOCUMENT_LABEL} и дождитесь извлечения данных.`)
      return
    }
    setAbrGenBusy(true)
    setAbrGenError(null)
    setAbrGenNote(null)
    try {
      const nd = restoreNewPermitDraftFromSession()
      const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
      const abr = mergeAbrPeopleFromNd(
        await generateAbrFromPpr(ppr, {
          nd,
          resolveName,
          resolveBadge,
        }),
        nd,
        resolveName,
        resolveBadge,
      )
      setForm((f) => ({
        ...f,
        abr,
        shortTitleForNarjad: f.shortTitleForNarjad || ppr.workTitle.trim(),
        workPlacesText: f.workPlacesText || abr.workLocation,
      }))
      setAbrGenNote(
        `${ABR_LABEL} сформирован (${APP_NAME}): ${abr.stages.length} этап(ов). Нажмите «Посмотреть».`,
      )
      setAbrReviewOpen(true)
      setManualReviewConfirmed(false)
    } catch (e) {
      setAbrGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setAbrGenBusy(false)
    }
  }

  async function generateNeboshFromPpr() {
    const ppr = loadPprForm()
    if (!ppr.controlMeasures?.items.length && !ppr.workStagesText.trim()) {
      setNeboshGenError(`Сначала загрузите ${SOURCE_DOCUMENT_LABEL} и дождитесь извлечения данных.`)
      return
    }
    setNeboshGenBusy(true)
    setNeboshGenError(null)
    setNeboshGenNote(null)
    try {
      const nd = restoreNewPermitDraftFromSession()
      const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
      const preparedBy = nd.performerUid.trim()
        ? resolveName(nd.performerUid)
        : user?.displayName?.trim() || ''
      const contractorOrg = nd.f02?.company?.trim() || ppr.contractorOrg
      const payload = await generateNeboshRiskAssessmentFromPpr(ppr, {
        preparedBy,
        contractorOrg,
      })
      setForm((current) =>
        mergeNeboshApprovalPeopleFromNd(
          applyNeboshAssessmentToAsor(
            prefillAsorTeamFromNd(nd, current, resolveName),
            payload,
          ),
          nd,
          resolveName,
          resolveBadge,
        ),
      )
      const groups = payload.operationGroups?.length ?? 0
      const hazards = (payload.operationGroups ?? []).reduce(
        (n, g) => n + (g.hazards?.length ?? 0),
        0,
      )
      setNeboshGenNote(
        `Оценка риска сформирована (${APP_NAME}): ${groups} заданий, ${hazards} опасностей. Нажмите «Посмотреть».`,
      )
      setNeboshReviewOpen(true)
      setManualReviewConfirmed(false)
    } catch (e) {
      setNeboshGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setNeboshGenBusy(false)
    }
  }

  async function viewAbrPdfDoc() {
    if (!form.abr?.stages.length) {
      showError(`Сформируйте ${ABR_LABEL} из исходного документа.`)
      return
    }
    setAbrPdfBusy(true)
    try {
      const ppr = loadPprForm()
      const nd = restoreNewPermitDraftFromSession()
      const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
      const abr = mergeAbrPeopleFromNd(
        applyAbrHeaderFromPprNd(
          { ...form.abr, ...prefillAbrPeopleFromNd(nd, resolveName, resolveBadge) },
          ppr,
          nd,
        ),
        nd,
        resolveName,
        resolveBadge,
      )
      const { base64, fileName } = await buildAbrPdf(abr)
      openPdfInBrowser(base64, pdfTabTitleFromFileName(fileName))
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setAbrPdfBusy(false)
    }
  }

  async function viewNeboshPdf() {
    if (!neboshReady) {
      setSubmitError('Заполните оценку риска вручную или сформируйте из ППР.')
      return
    }
    setNeboshPdfBusy(true)
    try {
      const nd = restoreNewPermitDraftFromSession()
      const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
      const merged = mergeNeboshApprovalPeopleFromNd(
        form,
        nd,
        resolveName,
        resolveBadge,
      )
      const title =
        merged.shortTitleForNarjad.trim() ||
        loadPprForm().workTitle.trim() ||
        'Оценка рисков'
      const { base64, fileName } = await buildNeboshRiskPdf(merged, title)
      openPdfInBrowser(base64, pdfTabTitleFromFileName(fileName))
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setNeboshPdfBusy(false)
    }
  }

  function resetDraft() {
    suppressAutosaveRef.current = true
    clearPackageSession()
    const nd = prepareNdprDraftForValidation(
      restoreNewPermitDraftFromSession(),
      user,
      participantDirectory,
    )
    const ppr = loadPprForm()
    const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
    setForm(
      ensureManualRiskScaffold(
        buildManualRiskAssessmentForm(nd, ppr, resolveName, (uid) =>
          resolveUserBadgeNo(uid, userDirectory),
        ),
        nd,
        ppr,
        resolveName,
        (uid) => resolveUserBadgeNo(uid, userDirectory),
      ),
    )
    setSubmitError(null)
    setManualReviewConfirmed(false)
    setAbrGenError(null)
    setAbrGenNote(null)
    setNeboshGenError(null)
    setNeboshGenNote(null)
    setAbrSectionMode('manual')
    setRiskSectionMode('manual')
    setAbrReviewOpen(false)
    setNeboshReviewOpen(false)
    window.queueMicrotask(() => {
      suppressAutosaveRef.current = false
    })
  }

  useEffect(() => {
    function onPackageCleared() {
      suppressAutosaveRef.current = true
      const nd = prepareNdprDraftForValidation(
        restoreNewPermitDraftFromSession(),
        user,
        participantDirectory,
      )
      const ppr = loadPprForm()
      const resolveName = (uid: string) => resolveUser(uid)?.displayName ?? uid
      setForm(
        ensureManualRiskScaffold(
          buildManualRiskAssessmentForm(nd, ppr, resolveName, (uid) =>
            resolveUserBadgeNo(uid, userDirectory),
          ),
          nd,
          ppr,
          resolveName,
          (uid) => resolveUserBadgeNo(uid, userDirectory),
        ),
      )
      setSubmitError(null)
      setManualReviewConfirmed(false)
      setAbrGenError(null)
      setAbrGenNote(null)
      setNeboshGenError(null)
      setNeboshGenNote(null)
      setAbrSectionMode('manual')
      setRiskSectionMode('manual')
      setAbrReviewOpen(false)
      setNeboshReviewOpen(false)
      window.queueMicrotask(() => {
        suppressAutosaveRef.current = false
      })
    }
    window.addEventListener(PACKAGE_CLEARED_EVENT, onPackageCleared)
    return () => window.removeEventListener(PACKAGE_CLEARED_EVENT, onPackageCleared)
  }, [])

  function updateAbr(abr: AbrForm) {
    setForm((f) => ({ ...f, abr }))
    setManualReviewConfirmed(false)
  }

  function updateFormReview(next: AsorForm) {
    setForm(next)
    setManualReviewConfirmed(false)
  }

  function proceedToPermissions() {
    if (!canProceedRisk) return
    const draft = prepareNdprDraftForValidation(
      restoreNewPermitDraftFromSession(),
      user,
      userDirectory,
    )
    const ndprErr = validateNdprDraft(draft)
    if (ndprErr) {
      showError(ndprErr)
      return
    }
    const asorErr = validateAsorForm(form)
    if (asorErr) {
      showError(asorErr)
      return
    }
    const ppr = loadPprForm()
    saveWorkPermissionsToSession(initializeWorkPermissionsBundle(draft, ppr))
    setRiskGatePassed()
    nav('/permissions')
  }

  async function submitNdprPackage() {
    setSubmitError(null)
    if (!isPprGatePassed()) {
      setSubmitError('Сначала загрузите документ ППР.')
      return
    }
    if (!isNdGatePassed()) {
      setSubmitError('Сначала заполните раздел «НДПР».')
      return
    }
    if (!manualReviewConfirmed) {
      setSubmitError(
        `Подтвердите ручную проверку ${ABR_LABEL} и оценки риска перед отправкой.`,
      )
      return
    }
    const asorErr = validateAsorForm(form)
    if (asorErr) {
      setSubmitError(asorErr)
      return
    }

    const draft = restoreNewPermitDraftFromSession()
    if (draft.executors.some((ex) => !ex.userUid.trim())) {
      setSubmitError('В НДПР у каждого работника должен быть выбран пользователь.')
      return
    }

    const ppr = loadPprForm()
    const asorWithApprovers = finalizeAsorFormForReady(
      seedApprovalNamesFromPermit(form, draft, resolveUser, resolveBadge),
      ppr,
    )
    let packageDraft = applyAsorToPermitDraft(draft, asorWithApprovers)
    const performerUid = resolvePerformerUidForPackage(
      packageDraft.performerUid,
      user,
      userDirectory,
    )
    packageDraft = {
      ...packageDraft,
      title: draft.title.trim() || packageDraft.title,
      workStages: draft.workStages,
      workDescription:
        draft.workStages.trim() ||
        draft.workDescription.trim() ||
        packageDraft.workDescription,
      ppr,
      asor: asorWithApprovers,
      f04: draft.permitType === 'cold' ? undefined : draft.f04,
      isContractorPermit: false,
      performerUid,
      registrationRefNo:
        draft.registrationRefNo.trim() || packageDraft.registrationRefNo,
    }

    setBusy(true)
    try {
      setSubmitStage('Сохранение наряда в базе…')
      const p = await ensurePermitForPackageSubmit({
        packageDraft,
        createPermit,
        updatePermit,
      })
      setSubmitStage('Формирование PDF-пакета для согласования…')
      const { buildSigningPackagePdf } = await import('../lib/buildSigningPackagePdf')
      const packagePdf = await buildSigningPackagePdf(p, resolveUser, participantDirectory)
      await updatePermit(p.id, { packagePdf })
      setSubmitStage('Отправка на согласование…')
      await transition(p.id, 'on_approval')
      setSubmitStage('Назначение подписантов и уведомления…')
      let provisionWarning: string | null = null
      try {
        const { provisionPermitSignersClient } = await import('../lib/provisionSigners')
        const result = await provisionPermitSignersClient(p.id)
        if (!result) {
          provisionWarning =
            'Наряд отправлен, но уведомления подписантам не созданы (Firebase Functions недоступны).'
        }
      } catch (e) {
        provisionWarning =
          e instanceof Error
            ? `Наряд отправлен, но уведомления не созданы: ${e.message}`
            : 'Наряд отправлен, но уведомления подписантам не созданы.'
      }
      clearPackageSession()
      nav(`/p/${p.id}`, { state: { provisionWarning } })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setSubmitStage(null)
    }
  }

  if (!ndprAccessible) {
    return (
      <div className="page narrow">
        <h1>{p.riskTitle}</h1>
        <p className="muted">{p.riskGateNdpr}</p>
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <Link className="btn primary" to={isPprGatePassed() ? '/new' : '/ppr'}>
            {isPprGatePassed() ? 'НДПР' : SOURCE_DOCUMENT_LABEL}
          </Link>
        </div>
      </div>
    )
  }

  if (boot) {
    return (
      <div className="page narrow">
        <p className="muted">Открываю черновик…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{p.riskTitle}</h1>
          <p className="muted small" style={{ marginTop: '-0.25rem' }}>
            {t.wizard.stepOf(3, wizardSteps)}
          </p>
        </div>
        <div className="btn-row page-header__cta">
          <Link className="btn ghost small" to="/ppr">
            {SOURCE_DOCUMENT_LABEL}
          </Link>
          <Link className="btn ghost small" to="/new">
            НДПР
          </Link>
          <button type="button" className="btn ghost small" onClick={resetDraft}>
            Очистить анкету
          </button>
        </div>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>{ABR_LABEL}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Заполните {ABR_LABEL} вручную или сформируйте автоматически по исходному документу.
        </p>
        <div className="journal-view-tabs" role="tablist" aria-label={ABR_LABEL}>
          <button
            type="button"
            role="tab"
            aria-selected={abrSectionMode === 'manual'}
            className={`journal-view-tab${abrSectionMode === 'manual' ? ' journal-view-tab--active' : ''}`}
            onClick={() => {
              setAbrSectionMode('manual')
              setAbrReviewOpen(true)
            }}
          >
            {rp.tabManualFill}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abrSectionMode === 'generate'}
            className={`journal-view-tab${abrSectionMode === 'generate' ? ' journal-view-tab--active' : ''}`}
            onClick={() => setAbrSectionMode('generate')}
          >
            {rp.tabGenerate}
          </button>
        </div>
        {abrSectionMode === 'generate' ? (
          <>
            <div className="btn-row risk-generate-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn primary"
                disabled={abrGenBusy || !isAbrAiAvailable()}
                onClick={() => void generateAbrFromPprDoc()}
              >
                {abrGenBusy
                  ? `${APP_NAME} составляет анализ…`
                  : `Сформировать ${ABR_LABEL}`}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={abrPdfBusy || abrGenBusy || !form.abr?.stages.length}
                onClick={() => void viewAbrPdfDoc()}
              >
                {abrPdfBusy && !abrGenBusy ? 'Открытие…' : 'Посмотреть'}
              </button>
            </div>
            {abrGenBusy && (
              <LoadingProgress
                label={`${APP_NAME} составляет анализ безопасности работ…`}
                indeterminate
                withTips
                fullscreen
              />
            )}
            {abrPdfBusy && !abrGenBusy && (
              <LoadingProgress
                label="Формирование PDF…"
                indeterminate
                withTips
                fullscreen
              />
            )}
          </>
        ) : (
          <AbrManualReview
            abr={form.abr ?? emptyAbrForm()}
            onChange={updateAbr}
            open={abrReviewOpen}
            onOpenChange={setAbrReviewOpen}
            embedded
          />
        )}
        {abrGenError && (
          <div className="alert error" role="alert" style={{ marginTop: '0.75rem' }}>
            {abrGenError}
          </div>
        )}
        {abrGenNote ? (
          <div className="alert" role="status" style={{ marginTop: '0.75rem' }}>
            {abrGenNote}
          </div>
        ) : abrReady ? (
          <div className="alert" role="status" style={{ marginTop: '0.75rem' }}>
            {ABR_LABEL} сформирован · {form.abr!.stages.length} этап(ов) · объект:{' '}
            {form.abr!.workLocation || '—'}
          </div>
        ) : null}
        {!abrGenNote && !abrReady && form.abr && form.abr.stages.length > 0 ? (
          <p className="muted xsmall" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            В документе: {form.abr.stages.length} этап(ов) · объект:{' '}
            {form.abr.workLocation || '—'}
          </p>
        ) : null}
      </section>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0 }}>Оценка риска</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Заполните оценку риска вручную или сформируйте автоматически по исходному документу.
        </p>
        <div className="journal-view-tabs" role="tablist" aria-label="Оценка риска">
          <button
            type="button"
            role="tab"
            aria-selected={riskSectionMode === 'manual'}
            className={`journal-view-tab${riskSectionMode === 'manual' ? ' journal-view-tab--active' : ''}`}
            onClick={() => {
              setRiskSectionMode('manual')
              setNeboshReviewOpen(true)
            }}
          >
            {rp.tabManualFill}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={riskSectionMode === 'generate'}
            className={`journal-view-tab${riskSectionMode === 'generate' ? ' journal-view-tab--active' : ''}`}
            onClick={() => setRiskSectionMode('generate')}
          >
            {rp.tabGenerate}
          </button>
        </div>
        {riskSectionMode === 'generate' ? (
          <>
            <div className="btn-row risk-generate-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn primary"
                disabled={neboshGenBusy || !isNeboshAiAvailable()}
                onClick={() => void generateNeboshFromPpr()}
              >
                {neboshGenBusy ? `${APP_NAME} формирует…` : 'Сформировать оценку риска'}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={neboshPdfBusy || neboshGenBusy || !neboshReady}
                onClick={() => void viewNeboshPdf()}
              >
                {neboshPdfBusy && !neboshGenBusy ? 'Открытие…' : 'Посмотреть'}
              </button>
            </div>
            {neboshGenBusy && (
              <LoadingProgress
                label={`${APP_NAME} формирует оценку риска…`}
                indeterminate
                withTips
                fullscreen
              />
            )}
            {neboshPdfBusy && !neboshGenBusy && (
              <LoadingProgress
                label="Формирование PDF…"
                indeterminate
                withTips
                fullscreen
              />
            )}
          </>
        ) : (
          <NeboshManualReview
            form={form}
            onChange={updateFormReview}
            open={neboshReviewOpen}
            onOpenChange={setNeboshReviewOpen}
            embedded
          />
        )}
        {neboshGenError && (
          <div className="alert error" role="alert" style={{ marginTop: '0.75rem' }}>
            {neboshGenError}
          </div>
        )}
        {neboshGenNote ? (
          <div className="alert" role="status" style={{ marginTop: '0.75rem' }}>
            {neboshGenNote}
          </div>
        ) : neboshReady ? (
          <div className="alert" role="status" style={{ marginTop: '0.75rem' }}>
            Оценка риска сформирована · {form.tasks.length} заданий, {neboshHazardCount}{' '}
            опасностей
          </div>
        ) : null}
        {!neboshGenNote && !neboshReady && form.tasks.length > 0 && (
          <p className="muted xsmall" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
            В документе: {form.tasks.length} заданий,{' '}
            {form.tasks.reduce((n, t) => n + t.hazards.length, 0)} опасностей.
          </p>
        )}
      </section>

      <section className="card" style={{ marginTop: '0.85rem', marginBottom: '3rem' }}>
        <h2 style={{ marginTop: 0 }}>Проверка перед отправкой</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Заполните документы вручную или сформируйте автоматически, откройте каждый для проверки и
          сверьте с полями ниже.
        </p>
        <ul className="compact-list small" style={{ margin: '0.75rem 0' }}>
          <li>
            {SOURCE_DOCUMENT_LABEL}:{' '}
            {pprAttachment?.dataBase64 ? (
              <span className="strong">{pprAttachment.fileName}</span>
            ) : (
              <span className="muted">файл не загружен</span>
            )}
          </li>
          <li>
            {ABR_LABEL}:{' '}
            {abrReady ? (
              <span className="strong">готов · {form.abr!.stages.length} этап(ов)</span>
            ) : (
              <span className="muted">не сформирован</span>
            )}
          </li>
          <li>
            Оценка риска:{' '}
            {neboshReady ? (
              <span className="strong">
                готова · {form.tasks.length} заданий, {neboshHazardCount} опасностей
              </span>
            ) : (
              <span className="muted">не сформирована</span>
            )}
          </li>
        </ul>
        <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
          {pprAttachment?.dataBase64 ? (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => openPprAttachmentInBrowser(pprAttachment)}
            >
              Посмотреть {SOURCE_DOCUMENT_LABEL.toLowerCase()}
            </button>
          ) : null}
          <button
            type="button"
            className="btn ghost small"
            disabled={!abrReady || abrPdfBusy}
            onClick={() => void viewAbrPdfDoc()}
          >
            {abrPdfBusy ? 'Открытие…' : `Посмотреть ${ABR_LABEL}`}
          </button>
          <button
            type="button"
            className="btn ghost small"
            disabled={!neboshReady || neboshPdfBusy}
            onClick={() => void viewNeboshPdf()}
          >
            {neboshPdfBusy ? 'Открытие…' : 'Посмотреть оценку риска'}
          </button>
        </div>
        <label className="check check--review" htmlFor="manual-review-confirmed">
          <input
            id="manual-review-confirmed"
            type="checkbox"
            checked={manualReviewConfirmed}
            onChange={(e) => setManualReviewConfirmed(e.target.checked)}
          />
          <span>
            Я проверил {ABR_LABEL} и оценку риска вручную, просмотрел документы и сверил данные
          </span>
        </label>
        <section className="submit-requirements" aria-label="Условия отправки на согласование">
          <h3 className="submit-requirements__title">Условия отправки</h3>
          <ul className="submit-requirements__list">
            {submitRequirements.map((req) => (
              <li
                key={req.id}
                className={
                  req.ok
                    ? 'submit-requirements__item submit-requirements__item--ok'
                    : 'submit-requirements__item submit-requirements__item--pending'
                }
              >
                <span className="submit-requirements__mark" aria-hidden>
                  {req.ok ? '✓' : '○'}
                </span>
                <span>
                  {req.label}
                  {!req.ok && req.hint ? (
                    <span className="submit-requirements__hint"> — {req.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="btn-row" style={{ marginTop: '0.85rem' }}>
          {permissionsRequired ? (
            <button
              type="button"
              className="btn primary"
              disabled={!canProceedRisk}
              onClick={() => proceedToPermissions()}
            >
              Далее — Разрешения
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              disabled={!canSubmit}
              onClick={() => void submitNdprPackage()}
            >
              {busy ? submitStage ?? 'Отправка…' : 'Отправить на согласование'}
            </button>
          )}
        </div>
        {busy && (
          <LoadingProgress
            label={submitStage ?? `${APP_NAME} отправляет пакет…`}
            indeterminate
            withTips
            fullscreen
          />
        )}
        {(!abrReady || !neboshReady) && (
          <p className="muted xsmall" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Заполните {ABR_LABEL} и оценку риска вручную или сформируйте автоматически, затем
            отметьте подтверждение проверки.
          </p>
        )}
        {!canSubmit && !busy && submitRequirements.some((r) => !r.ok) && (
          <p className="muted xsmall" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Выполните все пункты в списке «Условия отправки» — кнопка станет активной.
          </p>
        )}
        {!manualReviewConfirmed && abrReady && neboshReady && maySubmitPackage && (
          <p className="muted xsmall" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Отметьте подтверждение проверки, чтобы отправить пакет.
          </p>
        )}
        {!maySubmitPackage && (
          <p className="muted xsmall" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            {submitPermitPackageDeniedReason(user)}
          </p>
        )}
        {busy && submitStage && (
          <p className="muted small" style={{ marginTop: '0.65rem', marginBottom: 0 }}>
            Документ формируется при скачивании на карточке наряда — это ускоряет отправку.
          </p>
        )}
        {submitError && (
          <div className="alert error" role="alert" style={{ marginTop: '0.75rem' }}>
            {submitError}
          </div>
        )}
      </section>
    </div>
  )
}
