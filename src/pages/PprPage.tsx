import {
  extractWorkTitleFromDocHeader,
  looksLikeWorkScopeNotTitle,
  resolvePprWorkTitleFromAttachment,
} from '../lib/pprWorkTitle'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { LoadingProgress } from '../components/LoadingProgress'
import { PprDocumentUpload } from '../components/PprDocumentUpload'
import {
  extractPprControlMeasuresItems,
  type PprExtractStage,
} from '../lib/extractPprControlMeasures'
import { extractTextFromPprAttachment } from '../lib/pprDocText'
import { isPdfAttachment } from '../lib/pprGeminiPdfExtract'
import { titleFromFileName } from '../lib/pprAttachment'
import { effectivePprWorkTitle, isLikelyFileNameTitle, normalizePprWorkTitle } from '../lib/narjadTitle'
import { clearPackageSession, setNdprManualFillMode } from '../lib/packageSession'
import { saveNewPermitDraftToSession } from '../lib/newPermitDraftAutosave'
import { setPprGatePassed } from '../lib/pprGate'
import { APP_NAME } from '../config/branding'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'
import {
  loadPprForm,
  savePprForm,
  isPprAnalysisComplete,
  validatePprForm,
} from '../lib/pprAutosave'
import {
  applyNdprExtractToPprForm,
  applyPprToNdprSession,
} from '../lib/pprNdprExtract'
import {
  pprExtractProgressCeiling,
  pprExtractProgressLabel,
  pprExtractProgressPercent,
} from '../lib/loadingProgress'
import { emptyPprForm, type PprAttachment, type PprForm } from '../types/ppr'
import { emptyPermitDraft } from '../uog/permitDefaults'

type NdprFillMode = null | 'ppr' | 'manual'

function goToNdprFromPpr(form: PprForm, nav: ReturnType<typeof useNavigate>) {
  setNdprManualFillMode(false)
  applyPprToNdprSession(form)
  savePprForm(form)
  setPprGatePassed()
  nav('/new?from=ppr')
}

function goToNdprManual(nav: ReturnType<typeof useNavigate>) {
  clearPackageSession()
  setNdprManualFillMode(true)
  savePprForm(emptyPprForm())
  saveNewPermitDraftToSession(emptyPermitDraft())
  setPprGatePassed()
  nav('/new?from=ppr&manual=1')
}

export function PprPage() {
  const nav = useNavigate()
  const { showError } = useToast()
  const { t } = useLanguage()
  const p = t.pages
  const pp = t.pprPage
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState(() => loadPprForm())
  const [extracting, setExtracting] = useState(false)
  const [extractStage, setExtractStage] = useState<PprExtractStage | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const extractSeq = useRef(0)
  const aliveRef = useRef(true)
  const suppressSaveRef = useRef(false)
  const [formEpoch, setFormEpoch] = useState(0)
  const [fillMode, setFillMode] = useState<NdprFillMode>(() =>
    loadPprForm().attachment?.dataBase64 ? 'ppr' : null,
  )

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  function resetAll() {
    extractSeq.current += 1
    suppressSaveRef.current = true
    setExtracting(false)
    setExtractError(null)
    setExtractStage(null)
    setFillMode(null)
    clearPackageSession()
    const empty = emptyPprForm()
    savePprForm(empty)
    setForm(empty)
    setFormEpoch((n) => n + 1)
    window.queueMicrotask(() => {
      suppressSaveRef.current = false
    })
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('fresh') !== '1') return
    resetAll()
    const sp = new URLSearchParams(searchParams)
    sp.delete('fresh')
    setSearchParams(sp, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (suppressSaveRef.current || fillMode !== 'ppr') return
    savePprForm(form)
  }, [form, fillMode])

  useEffect(() => {
    const att = form.attachment
    if (!att?.dataBase64 || fillMode !== 'ppr' || isPdfAttachment(att)) return
    let cancelled = false
    void extractTextFromPprAttachment(att)
      .then((docText) => {
        if (cancelled) return
        const headerTitle = extractWorkTitleFromDocHeader(docText)
        if (!headerTitle) return
        setForm((f) => {
          if (f.workTitle.trim() === headerTitle) return f
          if (
            !f.workTitle.trim() ||
            isLikelyFileNameTitle(f.workTitle, att.fileName) ||
            looksLikeWorkScopeNotTitle(f.workTitle)
          ) {
            return { ...f, workTitle: headerTitle }
          }
          return f
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [form.attachment?.fileName, form.attachment?.uploadedAtIso, fillMode])

  const runControlMeasuresExtraction = useCallback(
    async (
      attachment: PprAttachment,
      workTitle: string,
      baseForm: PprForm,
    ) => {
      const seq = ++extractSeq.current
      setExtracting(true)
      setExtractError(null)
      setExtractStage('reading')
      try {
        const { doc, ndprExtract } = await extractPprControlMeasuresItems(attachment, {
          workTitle,
          onStage: (stage) => {
            if (seq === extractSeq.current) setExtractStage(stage)
          },
        })
        if (seq !== extractSeq.current) return

        const resolvedTitle =
          (await resolvePprWorkTitleFromAttachment(attachment, doc.workTitle)) ||
          effectivePprWorkTitle({
            ...baseForm,
            attachment,
            controlMeasures: doc,
            workTitle: doc.workTitle || workTitle,
          })

        let next: PprForm = {
          ...baseForm,
          attachment,
          controlMeasures: doc,
          workTitle: resolvedTitle,
        }
        if (ndprExtract) {
          next = applyNdprExtractToPprForm(next, ndprExtract)
        }

        setForm(next)
        setExtractStage(null)

        if (doc.items.length > 0 && aliveRef.current) {
          goToNdprFromPpr(next, nav)
        }
      } catch (e) {
        if (seq !== extractSeq.current) return
        setExtractError(e instanceof Error ? e.message : String(e))
        setForm((f) => ({ ...f, controlMeasures: undefined }))
        setExtractStage(null)
      } finally {
        if (seq === extractSeq.current) setExtracting(false)
      }
    },
    [nav],
  )

  async function onAttachmentChange(attachment: PprAttachment | undefined) {
    extractSeq.current += 1
    setExtractError(null)
    if (!attachment) {
      setForm((f) => ({ ...f, attachment: undefined, controlMeasures: undefined }))
      setExtracting(false)
      setExtractStage(null)
      return
    }

    const pending: PprForm = {
      ...form,
      attachment,
      controlMeasures: undefined,
      workTitle: '',
    }
    setForm(pending)
    if (fillMode === 'manual') return
    await runControlMeasuresExtraction(attachment, '', pending)
  }

  function resetForm() {
    resetAll()
  }

  function extractStageLabel(stage: PprExtractStage | null): string {
    return pprExtractProgressLabel(stage)
  }

  function continueToNdpr(e: React.FormEvent) {
    e.preventDefault()
    const v = validatePprForm(form, { extracting })
    if (v) {
      showError(v)
      return
    }
    goToNdprFromPpr(form, nav)
  }

  function chooseManual() {
    goToNdprManual(nav)
  }

  function chooseFromPpr() {
    setFillMode('ppr')
  }

  const canContinuePpr = isPprAnalysisComplete(form, { extracting })

  return (
    <div className="page narrow">
      <div className="page-header">
        <div>
          <h1>{t.nav.ppr}</h1>
          <p className="muted small page-subtitle">
            {t.wizard.stepOf(1, 3)}
          </p>
        </div>
      </div>

      {fillMode === null && (
        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{p.pprHowFill}</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {p.pprChooseMode}
          </p>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn primary" onClick={chooseManual}>
              {t.common.manual}
            </button>
            <button type="button" className="btn ghost" onClick={chooseFromPpr}>
              {p.pprWithAi}
            </button>
          </div>
        </section>
      )}

      {fillMode === 'ppr' && (
        <form className="card form" onSubmit={continueToNdpr}>
          <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setFillMode(null)
                setExtractError(null)
              }}
            >
              {pp.backToChoice}
            </button>
          </div>

          <PprDocumentUpload
            key={formEpoch}
            attachment={form.attachment}
            onAttachmentChange={onAttachmentChange}
          />

          {extracting && fillMode === 'ppr' && (
            <LoadingProgress
              label={extractStageLabel(extractStage)}
              value={pprExtractProgressPercent(extractStage)}
              creepTo={pprExtractProgressCeiling(extractStage)}
              withTips
              fullscreen
            />
          )}

          {extractError && fillMode === 'ppr' && (
            <div className="alert error" role="alert">
              {extractError}
              {form.attachment && (
                <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() =>
                      void runControlMeasuresExtraction(
                        form.attachment!,
                        normalizePprWorkTitle(
                          form.workTitle,
                          titleFromFileName(form.attachment!.fileName),
                        ),
                        form,
                      )
                    }
                  >
                    {pp.retry}
                  </button>
                </div>
              )}
            </div>
          )}

          {form.attachment &&
            !isPprAnalysisComplete(form, { extracting }) &&
            !extractError && (
              <p className="muted xsmall" style={{ marginBottom: 0 }}>
                {extracting
                  ? fillTemplate(pp.analyzing, { app: APP_NAME })
                  : t.riskPage.waitAnalysis}
              </p>
            )}

          <div className="btn-row actions">
            <button
              type="submit"
              className="btn primary"
              disabled={!canContinuePpr}
            >
              {p.pprNextNdpr}
            </button>
            <button type="button" className="btn ghost" onClick={resetForm}>
              {pp.clear}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
