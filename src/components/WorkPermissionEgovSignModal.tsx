import { useCallback, useEffect, useRef, useState } from 'react'
import type { Permit } from '../types/domain'
import type { StoredEgovSignature } from '../types/egovSignature'
import { buildWorkPermissionPdf } from '../lib/buildWorkPermissionPdf'
import { startSigexQrSigning, isSigexUserCancel } from '../lib/sigexQrSigning'
import {
  isNcaLayerAvailable,
  isNcaLayerUserCancel,
  signBase64WithNcaLayer,
} from '../lib/ncaLayerSigning'
import { EgovSignMethodTabs, type EgovSignTab } from './EgovSignMethodTabs'
import { NcaLayerSignPanel } from './NcaLayerSignPanel'
import { WORK_PERMISSION_SIGN_LABELS, type WorkPermissionDocument, type WorkPermissionSignRole } from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'

type Phase = 'preparing' | 'qr' | 'waiting' | 'submitting' | 'done' | 'error'

type WorkPermissionPackage = {
  base64: string
  documentHash: string
}

export function WorkPermissionEgovSignModal(props: {
  open: boolean
  permit: Permit
  doc: WorkPermissionDocument
  role: WorkPermissionSignRole
  signerUid: string
  signerName: string
  onClose: () => void
  onSigned: (sig: StoredEgovSignature) => void
}) {
  const { open, permit, doc, role, signerUid, signerName, onClose, onSigned } = props
  const { t } = useLanguage()
  const m = t.modals
  const c = t.common
  const ui = t.signingUi

  const [tab, setTab] = useState<EgovSignTab>('qr')
  const [phase, setPhase] = useState<Phase>('preparing')
  const [pkg, setPkg] = useState<WorkPermissionPackage | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [mobileLink, setMobileLink] = useState<string | null>(null)
  const [ncaAvailable, setNcaAvailable] = useState<boolean | null>(null)
  const [ncaBusy, setNcaBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qrStarted = useRef(false)
  const prepareStarted = useRef(false)

  const reset = useCallback(() => {
    setTab('qr')
    setPhase('preparing')
    setPkg(null)
    setQrSrc(null)
    setMobileLink(null)
    setNcaAvailable(null)
    setNcaBusy(false)
    setError(null)
    qrStarted.current = false
    prepareStarted.current = false
  }, [])

  const persistSignature = useCallback(
    async (cmsBase64: string, provider: StoredEgovSignature['provider']) => {
      if (!pkg) throw new Error(m.pdfPackageFailed)
      setPhase('submitting')
      const stored: StoredEgovSignature = {
        role: role as StoredEgovSignature['role'],
        signedAtIso: new Date().toISOString(),
        signedByUid: signerUid,
        signedByDisplayName: signerName,
        documentHash: pkg.documentHash,
        documentFormat: 'pdf',
        cmsBase64,
        provider,
      }
      setPhase('done')
      onSigned(stored)
    },
    [pkg, role, signerUid, signerName, onSigned, m.pdfPackageFailed],
  )

  const startQrFlow = useCallback(async () => {
    if (!pkg || qrStarted.current) return
    qrStarted.current = true
    setError(null)
    setPhase('qr')

    try {
      const session = await startSigexQrSigning({
        description: `NOVA — ${WORK_PERMISSION_SIGN_LABELS[role]}`,
        documentTitle: doc.title,
        dataBase64: pkg.base64,
        isPdf: true,
        meta: [
          { name: c.permit, value: permit.registrationRefNo || permit.id.slice(0, 8) },
          { name: c.permission, value: doc.kind },
          { name: c.role, value: WORK_PERMISSION_SIGN_LABELS[role] },
        ],
        sigexBaseUrl: import.meta.env.VITE_SIGEX_BASE_URL,
      })

      setQrSrc(`data:image/png;base64,${session.qrCodeBase64}`)
      setMobileLink(session.eGovMobileLaunchLink)

      const cmsBase64 = await session.waitForSignature(() => {
        setPhase('waiting')
      })

      await persistSignature(cmsBase64, 'egov_mobile')
    } catch (e) {
      qrStarted.current = false
      if (isSigexUserCancel(e)) {
        setError(m.signCancelled)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
      setPhase('error')
    }
  }, [pkg, permit, doc, role, persistSignature, m.signCancelled, c.permit, c.permission, c.role])

  const signWithNcaLayer = useCallback(async () => {
    if (!pkg) return
    setError(null)
    setNcaBusy(true)
    try {
      const cmsBase64 = await signBase64WithNcaLayer(pkg.base64)
      await persistSignature(cmsBase64, 'ncalayer')
    } catch (e) {
      if (isNcaLayerUserCancel(e)) {
        setError(ui.ncalayerCancelled)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
      setPhase('error')
    } finally {
      setNcaBusy(false)
    }
  }, [pkg, persistSignature, ui.ncalayerCancelled])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    if (prepareStarted.current) return
    prepareStarted.current = true

    let cancelled = false

    ;(async () => {
      try {
        setPhase('preparing')
        setError(null)
        const built = await buildWorkPermissionPdf(doc)
        if (cancelled) return
        setPkg({ base64: built.base64, documentHash: built.documentHash })
        const nca = await isNcaLayerAvailable()
        if (cancelled) return
        setNcaAvailable(nca)
        setPhase('qr')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, doc, reset])

  useEffect(() => {
    if (!open || !pkg || tab !== 'qr' || phase === 'error' || phase === 'done') return
    if (phase === 'preparing' || phase === 'submitting') return
    void startQrFlow()
  }, [open, pkg, tab, phase, startQrFlow])

  function selectTab(next: EgovSignTab) {
    if (
      phase === 'preparing' ||
      phase === 'waiting' ||
      phase === 'submitting' ||
      phase === 'done'
    ) {
      return
    }
    setTab(next)
    if (phase === 'error') {
      setError(null)
      qrStarted.current = false
      setQrSrc(null)
      setMobileLink(null)
      setPhase('qr')
    }
  }

  if (!open) return null

  const tabsDisabled =
    phase === 'preparing' || phase === 'waiting' || phase === 'submitting' || phase === 'done'

  return (
    <div className="egov-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="egov-modal card" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{ui.approveEgov} — {WORK_PERMISSION_SIGN_LABELS[role]}</h2>
        <p className="muted small">{doc.title}</p>

        <EgovSignMethodTabs
          tab={tab}
          disabled={tabsDisabled}
          pkgReady={Boolean(pkg)}
          onTabChange={selectTab}
        />

        {tab === 'qr' && phase === 'qr' && qrSrc ? (
          <img src={qrSrc} alt={ui.approveEgov} className="egov-qr-img" />
        ) : null}

        {tab === 'qr' && mobileLink && phase === 'waiting' ? (
          <p className="small" style={{ textAlign: 'center' }}>
            <a href={mobileLink} target="_blank" rel="noreferrer">
              eGov Mobile
            </a>
          </p>
        ) : null}

        {tab === 'qr' && phase === 'waiting' ? <p className="muted">{ui.waitingDefault}</p> : null}

        {tab === 'ncalayer' && phase !== 'done' && phase !== 'submitting' && phase !== 'preparing' ? (
          <NcaLayerSignPanel
            available={ncaAvailable}
            busy={ncaBusy}
            disabled={!pkg}
            onSign={() => void signWithNcaLayer()}
          />
        ) : null}

        {phase === 'preparing' && !error ? <p className="muted">{c.formingPdf}</p> : null}
        {phase === 'submitting' ? <p className="muted">{c.saving}</p> : null}
        {phase === 'done' ? <p className="muted">{ui.signed}</p> : null}
        {error ? <p className="small" style={{ color: 'var(--danger)' }}>{error}</p> : null}

        <button type="button" className="btn ghost" onClick={onClose}>
          {c.close}
        </button>
      </div>
    </div>
  )
}
