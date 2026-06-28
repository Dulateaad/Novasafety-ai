import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DocumentKitSummary } from '../components/DocumentKitSummary'
import { LoadingProgress } from '../components/LoadingProgress'
import { WorkPermissionIcon } from '../components/WorkPermissionIcon'
import { WorkPermissionFormEditor } from '../components/WorkPermissionFormEditor'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate, workPermissionKindLabel } from '../i18n/getLocale'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { isRiskGatePassed } from '../lib/riskGate'
import { setPermissionsGatePassed } from '../lib/permissionsGate'
import { loadPprForm } from '../lib/pprAutosave'
import { restoreNewPermitDraftFromSession } from '../lib/newPermitDraftAutosave'
import { prepareNdprDraftForValidation } from '../lib/validateNdprDraft'
import { renderSingleWorkPermission } from '../lib/buildWorkPermissionPdf'
import { openWorkPermissionPdf } from '../lib/openWorkPermissionPdf'
import {
  canUserSubmitPermitPackage,
  submitPermitPackageDeniedReason,
} from '../lib/permitAccess'
import { applyAsorToPermitDraft } from '../lib/asorPrefill'
import { resolveUserBadgeNo } from '../lib/userBadgeNumbers'
import { finalizeAsorFormForReady } from '../lib/finalizeGeneratedRiskDocs'
import { seedApprovalNamesFromPermit } from '../lib/approvalSequence'
import { executeNdprPackageSubmit } from '../lib/submitNdprPackageFlow'
import {
  initializeWorkPermissionsBundle,
  permissionNoticesForActivities,
  requiresWorkPermissions,
  validateWorkPermissionsBundle,
  ensureWorkPermissionsPdfsReady,
  isWorkPermissionPdfReady,
  wizardStepCount,
} from '../lib/workPermissions'
import {
  restoreWorkPermissionsFromSession,
  saveWorkPermissionsToSession,
} from '../lib/workPermissionsAutosave'
import { validateNdprDraft } from '../lib/validateNdprDraft'
import { scrollAppToTopWithRetries } from '../lib/scrollAppToTop'
import '../ndpr-page.css'
import { validateAsorForm } from '../lib/validateAsorForm'
import { ASOR_EDITOR_AUTOSAVE_KEY, type AsorForm } from '../types/asor'
import type {
  WorkPermissionDocument,
  WorkPermissionsBundle,
} from '../types/workPermissions'

function loadAsorFromSession(): AsorForm | null {
  try {
    const raw = sessionStorage.getItem(ASOR_EDITOR_AUTOSAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AsorForm
  } catch {
    return null
  }
}

export function PermissionsPage() {
  const {
    user,
    userDirectory,
    resolveUser,
    createPermit,
    updatePermit,
    transition,
    authMode,
    authReady,
    profileError,
  } = useSession()
  const { t, language } = useLanguage()
  const p = t.pages
  const pp = t.permissionsPage
  const pb = t.permissionsBody
  const c = t.common
  const resolveBadge = (uid: string) => resolveUserBadgeNo(uid, userDirectory)
  const nav = useNavigate()
  const { showError } = useToast()
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<string | null>(null)
  const [bundle, setBundle] = useState<WorkPermissionsBundle | null>(null)

  const draft = useMemo(
    () => prepareNdprDraftForValidation(restoreNewPermitDraftFromSession(), user, userDirectory),
    [user, userDirectory],
  )
  const form = useMemo(() => loadAsorFromSession(), [])
  const ppr = useMemo(() => loadPprForm(), [])
  const templates = useMemo(() => permissionNoticesForActivities(draft), [draft])
  const steps = wizardStepCount(draft)
  const permissionsRequired = requiresWorkPermissions(draft)

  useEffect(() => {
    const cancel = scrollAppToTopWithRetries()
    return cancel
  }, [])

  useEffect(() => {
    if (!permissionsRequired) return
    setBundle((prev) => {
      if (prev) return prev
      return (
        restoreWorkPermissionsFromSession() ??
        initializeWorkPermissionsBundle(draft, ppr ?? undefined)
      )
    })
  }, [draft, ppr, permissionsRequired])

  useEffect(() => {
    if (bundle) saveWorkPermissionsToSession(bundle)
  }, [bundle])

  const updateDoc = useCallback(
    (kind: WorkPermissionDocument['kind'], patch: Partial<WorkPermissionDocument>) => {
      setBundle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          updatedAtIso: new Date().toISOString(),
          documents: prev.documents.map((d) => {
            if (d.kind !== kind) return d
            const next = { ...d, ...patch, form: { ...d.form, ...patch.form } }
            if (patch.form) {
              next.generatedAtIso = undefined
              next.pdfBase64 = undefined
              next.documentHash = undefined
            }
            return next
          }),
        }
      })
    },
    [],
  )

  async function generateSinglePermission(kind: WorkPermissionDocument['kind']) {
    if (!bundle) return
    const doc = bundle.documents.find((d) => d.kind === kind)
    if (!doc) return
    setBusy(true)
    setStage(fillTemplate(pp.formingKind, { kind: workPermissionKindLabel(kind, language) }))
    try {
      const rendered = await renderSingleWorkPermission(doc)
      setBundle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          updatedAtIso: new Date().toISOString(),
          documents: prev.documents.map((d) => (d.kind === kind ? rendered : d)),
        }
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[work-permission-pdf]', e)
      showError(msg || pp.pdfFailed)
    } finally {
      setBusy(false)
      setStage(null)
    }
  }

  async function submitPackage() {
    if (!user || !form || !bundle) return
    if (!canUserSubmitPermitPackage(user)) {
      showError(submitPermitPackageDeniedReason(user))
      return
    }

    setBusy(true)
    setStage(pp.prepPackage)
    try {
      const readyBundle = await ensureWorkPermissionsPdfsReady(draft, bundle, ppr ?? undefined)
      setBundle(readyBundle)

      const permErr = validateWorkPermissionsBundle(readyBundle, draft)
      if (permErr) {
        showError(permErr)
        return
      }
      const asorErr = validateAsorForm(form)
      if (asorErr) {
        showError(asorErr)
        return
      }
      const ndprErr = validateNdprDraft(draft)
      if (ndprErr) {
        showError(ndprErr)
        return
      }

      const asorWithApprovers = finalizeAsorFormForReady(
        seedApprovalNamesFromPermit(form, draft, resolveUser, resolveBadge),
        ppr ?? undefined,
      )
      let packageDraft = applyAsorToPermitDraft(draft, asorWithApprovers)
      packageDraft = {
        ...packageDraft,
        ppr: ppr ?? undefined,
        asor: asorWithApprovers,
        workPermissions: readyBundle,
      }

      setPermissionsGatePassed()
      setStage(pp.submitApproval)
      const { provisionWarning, permitId } = await executeNdprPackageSubmit({
        packageDraft,
        createPermit,
        updatePermit,
        transition,
        resolveUser,
        userDirectory,
        nav,
      })
      nav(`/p/${permitId}`, { state: { provisionWarning } })
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setStage(null)
    }
  }

  if (!permissionsRequired) {
    return (
      <div className="page narrow">
        <h1>{p.permissionsTitle}</h1>
        <p className="muted">{t.access.gatePermissionsNotNeeded}</p>
        <Link className="btn primary" to="/risk-assessment">
          {p.permissionsGoRisk}
        </Link>
      </div>
    )
  }

  if (!isRiskGatePassed()) {
    return (
      <div className="page narrow">
        <h1>{p.permissionsTitle}</h1>
        <p className="muted">{p.permissionsGateRisk}</p>
        <Link className="btn primary" to="/risk-assessment">
          {p.permissionsGoRisk}
        </Link>
      </div>
    )
  }

  if (authMode === 'firebase' && authReady && !user) {
    return (
      <div className="page narrow">
        <h1>{p.permissionsTitle}</h1>
        <p className="muted">
          {t.login.subtitle}. {t.access.loginRequired}
        </p>
        {profileError ? <p className="muted small">{profileError}</p> : null}
        <Link className="btn primary" to="/login">
          {t.login.signIn}
        </Link>
      </div>
    )
  }

  if (user && !canUserSubmitPermitPackage(user)) {
    return (
      <div className="page narrow">
        <h1>{p.permissionsTitle}</h1>
        <p className="muted">
          Раздел «Разрешения» при создании наряда заполняет производитель работ (колонка «Требуется»).
          Допускающий отмечает колонку «Имеется» на карточке наряда в журнале после отправки на согласование.
        </p>
        <Link className="btn primary" to="/">
          К журналу
        </Link>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="page narrow">
        <p className="muted">{c.loading}</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{p.permissionsTitle}</h1>
          <p className="muted small" style={{ marginTop: '-0.25rem' }}>
            {t.wizard.stepOf(steps, steps)}
          </p>
        </div>
        <div className="btn-row page-header__cta">
          <Link className="btn ghost small" to="/ppr">
            {t.nav.ppr}
          </Link>
          <Link className="btn ghost small" to="/new">
            {t.nav.ndpr}
          </Link>
          <Link className="btn ghost small" to="/risk-assessment">
            {t.nav.risk}
          </Link>
        </div>
      </div>

      <DocumentKitSummary templates={templates} />

      {bundle.documents.map((doc) => {
        const meta = WORK_PERMISSION_BY_KIND[doc.kind]
        return (
          <section
            key={doc.kind}
            className={`card work-perm-card work-perm-card--${meta.style}`}
          >
            <header className="work-perm-card__head">
              <WorkPermissionIcon kind={doc.kind} size={32} />
              <div className="work-perm-card__intro">
                <h2 className="work-perm-card__title">{doc.title}</h2>
                <p className="work-perm-card__meta muted xsmall">
                  {fillTemplate(pb.cardMeta, { shortLabel: meta.shortLabel })}
                </p>
                {isWorkPermissionPdfReady(doc) ? (
                  <span className="work-perm-card__status">{pb.pdfReady}</span>
                ) : (
                  <span className="work-perm-card__status work-perm-card__status--pending">
                    {pb.pdfPending}
                  </span>
                )}
              </div>
              <div className="work-perm-card__actions btn-row">
                <button
                  type="button"
                  className="btn primary small"
                  disabled={busy}
                  onClick={() => void generateSinglePermission(doc.kind)}
                >
                  {busy ? c.forming : c.generatePermission}
                </button>
                {doc.pdfBase64 || doc.generatedAtIso ? (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => void openWorkPermissionPdf(doc)}
                  >
                    {fillTemplate(t.docKit.viewPdf, { label: c.document })}
                  </button>
                ) : null}
              </div>
            </header>

            <WorkPermissionFormEditor
              doc={doc}
              variant="permissions-wizard"
              onChange={(form) => updateDoc(doc.kind, { form })}
            />
          </section>
        )
      })}

      <section className="card">
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void submitPackage()}
          >
            {busy ? stage ?? p.permissionsSubmitting : p.permissionsSubmit}
          </button>
        </div>
        {busy ? (
          <LoadingProgress
            label={stage ?? c.saving}
            indeterminate
            withTips
            fullscreen
          />
        ) : null}
      </section>
    </div>
  )
}
