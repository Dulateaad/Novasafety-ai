import { useCallback, useEffect, useRef, useState } from 'react'
import type { Permit } from '../types/domain'
import type { StoredCrewAckSignature } from '../types/crewAck'
import { buildCrewAckPackagePdf } from '../lib/buildCrewAckPdf'
import {
  fetchCrewAckDocument,
  submitCrewAcknowledgmentToServer,
} from '../lib/egovFunctions'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import {
  isSigexUserCancel,
  startSigexQrSigning,
} from '../lib/sigexQrSigning'
import {
  isNcaLayerAvailable,
  isNcaLayerUserCancel,
  signBase64WithNcaLayer,
} from '../lib/ncaLayerSigning'
import { EgovSignMethodTabs, type EgovSignTab } from './EgovSignMethodTabs'
import { NcaLayerSignPanel } from './NcaLayerSignPanel'
import { useSession } from '../context/SessionContext'
import { useNetwork } from '../context/NetworkContext'
import { useSigningSettings } from '../hooks/useSigningSettings'
import { profileNameForSigningCheck } from '../lib/signerIdentityHint'
import { useLanguage } from '../context/LanguageContext'

type Phase = 'preparing' | 'qr' | 'waiting' | 'submitting' | 'done' | 'error'

type CrewAckPackage = {
  base64: string
  documentHash: string
  sessionId: string | null
}

export function CrewAckSignModal(props: {
  open: boolean
  permit: Permit
  signerUid: string
  signerName: string
  onClose: () => void
  onSigned: (sig: StoredCrewAckSignature) => void
}) {
  const { open, permit, signerUid, signerName, onClose, onSigned } = props
  const { authMode, refresh, resolveUser, userDirectory } = useSession()
  const { online } = useNetwork()
  const { verifyEgovFio } = useSigningSettings()
  const { t } = useLanguage()
  const m = t.modals
  const c = t.common
  const crew = t.crew
  const w = t.crewWorker
  const ui = t.signingUi
  const useServer = authMode === 'firebase'

  const [tab, setTab] = useState<EgovSignTab>('qr')
  const [phase, setPhase] = useState<Phase>('preparing')
  const [pkg, setPkg] = useState<CrewAckPackage | null>(null)
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
    async (cmsBase64: string, provider: StoredCrewAckSignature['provider']) => {
      if (!pkg) throw new Error(m.pdfPackageFailed)

      setPhase('submitting')
      let stored: StoredCrewAckSignature
      if (useServer) {
        if (!pkg.sessionId) throw new Error(m.signServerUnavailableAck)
        stored = await submitCrewAcknowledgmentToServer(pkg.sessionId, cmsBase64, provider)
        await refresh()
      } else {
        stored = {
          signedAtIso: new Date().toISOString(),
          signedByUid: signerUid,
          signedByDisplayName: signerName,
          documentHash: pkg.documentHash,
          cmsBase64,
          provider,
        }
      }

      notifySigningInvitesRefresh()
      onSigned(stored)
      setPhase('done')
    },
    [
      pkg,
      useServer,
      signerUid,
      signerName,
      refresh,
      onSigned,
      m.pdfPackageFailed,
      m.signServerUnavailableAck,
    ],
  )

  const startQrFlow = useCallback(async () => {
    if (!pkg || qrStarted.current) return
    qrStarted.current = true
    setError(null)
    setPhase('qr')

    try {
      const session = await startSigexQrSigning({
        description: `NOVA SAFETY AI — ${crew.label}`,
        documentTitle: `${m.wpTitle} ${permit.registrationRefNo || permit.id.slice(0, 8)}`,
        dataBase64: pkg.base64,
        isPdf: true,
        meta: [
          { name: m.regNoField, value: permit.registrationRefNo || c.na },
          { name: c.document, value: crew.documentAbrRisk },
          { name: 'Hash', value: pkg.documentHash.slice(0, 16) + '…' },
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
  }, [pkg, permit, persistSignature, crew.label, crew.documentAbrRisk, m, c.document, c.na])

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
        const built = await buildCrewAckPackagePdf(permit, resolveUser, userDirectory)
        if (cancelled) return

        const pdfBytes = Uint8Array.from(atob(built.base64), (ch) => ch.charCodeAt(0))
        let sessionId: string | null = null
        if (useServer) {
          const doc = await fetchCrewAckDocument(permit.id, {
            documentHash: built.documentHash,
            pdfByteLength: pdfBytes.length,
          })
          if (cancelled) return
          sessionId = doc.sessionId
        }

        setPkg({
          base64: built.base64,
          documentHash: built.documentHash,
          sessionId,
        })
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
  }, [open, permit, resolveUser, userDirectory, useServer, reset])

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

  const modalSteps = [
    {
      key: 'prepare',
      label: w.modalStepPrepare,
      active: phase === 'preparing',
      done: phase !== 'preparing' && phase !== 'error',
    },
    {
      key: 'sign',
      label: tab === 'ncalayer' ? ui.ncalayerStepSignShort : w.modalStepQr,
      active: phase === 'qr' || phase === 'waiting' || ncaBusy,
      done: phase === 'submitting' || phase === 'done',
    },
    {
      key: 'verify',
      label: w.modalStepSign,
      active: phase === 'submitting',
      done: phase === 'done',
    },
    {
      key: 'done',
      label: w.modalStepDone,
      active: phase === 'done',
      done: phase === 'done',
    },
  ] as const

  const tabsDisabled =
    phase === 'preparing' || phase === 'waiting' || phase === 'submitting' || phase === 'done'

  return (
    <div className="egov-modal-backdrop" role="dialog" aria-modal="true">
      <div className="egov-modal card crew-ack-modal">
        <div className="egov-modal__header">
          <h2 style={{ margin: 0 }}>{crew.label}</h2>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label={m.closeAria}>
            ✕
          </button>
        </div>
        <p className="strong small" style={{ marginTop: 0 }}>
          {crew.confirmation}
        </p>
        <p className="muted small">
          {ui.approveEgov} · {crew.documentAbrRisk} · {m.wpTitle}{' '}
          {permit.registrationRefNo || c.na}
        </p>

        {verifyEgovFio && resolveUser(signerUid)?.displayName && (
          <p className="small muted" style={{ marginTop: '-0.25rem' }}>
            {m.verifyingEsighAndFio}{' '}
            <strong>{profileNameForSigningCheck(resolveUser(signerUid)!.displayName)}</strong>
          </p>
        )}
        {!verifyEgovFio && authMode === 'firebase' && (
          <p className="small muted" style={{ marginTop: '-0.25rem' }}>
            {m.verifyingEsigh}
          </p>
        )}

        <EgovSignMethodTabs
          tab={tab}
          disabled={tabsDisabled}
          pkgReady={Boolean(pkg)}
          onTabChange={selectTab}
        />

        <div className="crew-ack-modal__steps" aria-hidden>
          {modalSteps.map((step) => (
            <div
              key={step.key}
              className={[
                'crew-ack-modal__step',
                step.active ? 'is-active' : '',
                step.done ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="crew-ack-modal__step-dot" />
              {step.label}
            </div>
          ))}
        </div>

        {!online && <p className="alert error">{ui.needInternet}</p>}

        {tab === 'qr' && phase === 'qr' && qrSrc && (
          <div className="egov-qr-wrap">
            <img src={qrSrc} alt={ui.approveEgov} className="egov-qr-img" />
          </div>
        )}

        {tab === 'qr' && mobileLink && phase === 'waiting' && (
          <p className="small" style={{ textAlign: 'center' }}>
            <a href={mobileLink} target="_blank" rel="noreferrer">
              eGov Mobile
            </a>
          </p>
        )}

        {tab === 'qr' && phase === 'waiting' && (
          <p className="strong small" role="status" style={{ textAlign: 'center' }}>
            {ui.waitingDefault}
          </p>
        )}

        {tab === 'ncalayer' && phase !== 'done' && phase !== 'submitting' && phase !== 'preparing' && (
          <NcaLayerSignPanel
            available={ncaAvailable}
            busy={ncaBusy}
            disabled={!pkg}
            onSign={() => void signWithNcaLayer()}
          />
        )}

        {phase === 'preparing' && !error && (
          <p className="muted" role="status">
            {c.formingPdf}
          </p>
        )}

        {phase === 'submitting' && (
          <p className="small" style={{ textAlign: 'center' }}>
            {verifyEgovFio ? m.verifyingEsighAndFio : c.saving}
          </p>
        )}

        {phase === 'done' && (
          <p className="small" style={{ textAlign: 'center' }}>
            {ui.signed}
          </p>
        )}

        {error && <p className="alert error">{error}</p>}

        <div className="btn-row actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            {c.close}
          </button>
        </div>
      </div>
    </div>
  )
}
