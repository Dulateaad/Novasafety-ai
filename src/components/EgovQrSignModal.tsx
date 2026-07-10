import { useCallback, useEffect, useRef, useState } from 'react'
import type { Permit } from '../types/domain'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import { profileNameForSigningCheck } from '../lib/signerIdentityHint'
import {
  submitEgovSignatureToServer,
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
import {
  prepareEgovSigningPackage,
  type EgovSigningPackage,
} from '../lib/prepareEgovSigningPackage'
import { useSession } from '../context/SessionContext'
import { useSigningSettings } from '../hooks/useSigningSettings'
import { useLanguage } from '../context/LanguageContext'

type SignTab = EgovSignTab
type Phase =
  | 'preparing'
  | 'qr'
  | 'waiting'
  | 'ncalayer'
  | 'submitting'
  | 'done'
  | 'error'

export function EgovQrSignModal(props: {
  open: boolean
  permit: Permit
  role: EgovSignRole
  signerUid: string
  signerName: string
  onClose: () => void
  onSigned: (sig: StoredEgovSignature) => void
}) {
  const { open, permit, role, signerUid, signerName, onClose, onSigned } = props
  const { authMode, refresh, resolveUser, userDirectory } = useSession()
  const { verifyEgovFio } = useSigningSettings()
  const { t } = useLanguage()
  const m = t.modals
  const c = t.common
  const ui = t.signingUi
  const w = t.crewWorker
  const useServerPdf = authMode === 'firebase'

  const [tab, setTab] = useState<SignTab>('qr')
  const [phase, setPhase] = useState<Phase>('preparing')
  const [pkg, setPkg] = useState<EgovSigningPackage | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [mobileLink, setMobileLink] = useState<string | null>(null)
  const [businessLink, setBusinessLink] = useState<string | null>(null)
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
    setBusinessLink(null)
    setNcaAvailable(null)
    setError(null)
    qrStarted.current = false
    prepareStarted.current = false
  }, [])

  const persistSignature = useCallback(
    async (cmsBase64: string, provider: StoredEgovSignature['provider']) => {
      if (!pkg) throw new Error(m.pdfPackageFailed)

      if (useServerPdf) {
        if (!pkg.sessionId) throw new Error(m.signServerUnavailable)
        setPhase('submitting')
        const stored = await submitEgovSignatureToServer(
          pkg.sessionId,
          cmsBase64,
          provider,
        )
        await refresh()
        notifySigningInvitesRefresh()
        setPhase('done')
        onSigned(stored)
        return
      }

      const stored: StoredEgovSignature = {
        role,
        signedAtIso: new Date().toISOString(),
        signedByUid: signerUid,
        signedByDisplayName: signerName,
        documentHash: pkg.documentHash,
        documentFormat: pkg.isPdf ? 'pdf' : 'text',
        cmsBase64,
        provider,
      }
      setPhase('done')
      onSigned(stored)
      notifySigningInvitesRefresh()
    },
    [
      pkg,
      useServerPdf,
      role,
      signerUid,
      signerName,
      refresh,
      onSigned,
      m.pdfPackageFailed,
      m.signServerUnavailable,
    ],
  )

  const startQrFlow = useCallback(async () => {
    if (!pkg || qrStarted.current) return
    qrStarted.current = true
    setError(null)
    setPhase('qr')

    try {
      const session = await startSigexQrSigning({
        description: `NOVA SAFETY AI — ${t.egovRoles[role]}`,
        documentTitle: `${m.wpTitle} ${permit.registrationRefNo || permit.id.slice(0, 8)}`,
        dataBase64: pkg.dataBase64,
        isPdf: pkg.isPdf,
        meta: [
          { name: m.regNoField, value: permit.registrationRefNo || c.na },
          { name: m.roleField, value: t.egovRoles[role] },
          { name: 'Hash', value: pkg.documentHash.slice(0, 16) + '…' },
          { name: m.formatField, value: pkg.isPdf ? 'PDF' : 'TEXT' },
        ],
        sigexBaseUrl: import.meta.env.VITE_SIGEX_BASE_URL,
      })

      setQrSrc(`data:image/png;base64,${session.qrCodeBase64}`)
      setMobileLink(session.eGovMobileLaunchLink)
      setBusinessLink(session.eGovBusinessLaunchLink)

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
  }, [pkg, permit, role, signerName, persistSignature, t.egovRoles, m, c.na])

  const signWithNcaLayer = useCallback(async () => {
    if (!pkg) return
    setError(null)
    setNcaBusy(true)
    try {
      const cmsBase64 = await signBase64WithNcaLayer(pkg.dataBase64)
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
        const prepared = await prepareEgovSigningPackage({
          permit,
          role,
          signerUid,
          signerName,
          useServerPdf,
          resolveUser,
          userDirectory,
        })
        if (cancelled) return
        setPkg(prepared)
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
  }, [
    open,
    permit,
    role,
    signerUid,
    signerName,
    useServerPdf,
    resolveUser,
    userDirectory,
    reset,
  ])

  useEffect(() => {
    if (!open || !pkg || tab !== 'qr' || phase === 'error' || phase === 'done') return
    if (phase === 'preparing' || phase === 'submitting') return
    void startQrFlow()
  }, [open, pkg, tab, phase, startQrFlow])

  function selectTab(next: SignTab) {
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
      setBusinessLink(null)
      setPhase('qr')
    }
  }

  const signerProfile = resolveUser(signerUid)

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
          <h2 style={{ margin: 0 }}>{ui.approveEgov}</h2>
          <button
            type="button"
            className="btn ghost small"
            onClick={onClose}
            aria-label={m.closeAria}
          >
            ✕
          </button>
        </div>
        <p className="muted small">
          {t.egovRoles[role]} · {permit.title}
          {useServerPdf && (
            <>
              {' '}
              · <span className="badge status-issued">PDF</span>
            </>
          )}
        </p>
        {verifyEgovFio && signerProfile?.displayName && (
          <p className="small muted" style={{ marginTop: '-0.25rem' }}>
            {m.verifyingEsighAndFio}{' '}
            <strong>{profileNameForSigningCheck(signerProfile.displayName)}</strong>
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

        {tab === 'qr' && phase === 'qr' && qrSrc && (
          <>
            <p className="small">{t.docKit.approvalPackage}</p>
            <div className="egov-qr-wrap">
              <img src={qrSrc} alt={ui.approveEgov} className="egov-qr-img" />
            </div>
            {(mobileLink || businessLink) && (
              <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                {mobileLink ? (
                  <a className="btn ghost small" href={mobileLink}>
                    eGov Mobile
                  </a>
                ) : null}
                {businessLink ? (
                  <a className="btn ghost small" href={businessLink}>
                    eGov Business
                  </a>
                ) : null}
              </div>
            )}
          </>
        )}

        {tab === 'qr' && phase === 'waiting' && (
          <p className="strong" role="status">
            {ui.waitingQrScan}
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
          <p className="strong" role="status">
            {verifyEgovFio ? m.verifyingEsighAndFio : m.verifyingEsigh}
          </p>
        )}

        {phase === 'done' && (
          <p className="strong" role="status">
            {ui.signed}
          </p>
        )}

        {error ? (
          <div className="alert error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="btn-row actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {c.close}
          </button>
        </div>
      </div>
    </div>
  )
}
