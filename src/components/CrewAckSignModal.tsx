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
import { useSession } from '../context/SessionContext'
import { useNetwork } from '../context/NetworkContext'
import { useSigningSettings } from '../hooks/useSigningSettings'
import { profileNameForSigningCheck } from '../lib/signerIdentityHint'
import { useLanguage } from '../context/LanguageContext'

type Phase = 'idle' | 'qr' | 'waiting' | 'submitting' | 'done' | 'error'

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
  const ui = t.signingUi
  const useServer = authMode === 'firebase'

  const [phase, setPhase] = useState<Phase>('idle')
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [mobileLink, setMobileLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const started = useRef(false)

  const reset = useCallback(() => {
    setPhase('idle')
    setQrSrc(null)
    setMobileLink(null)
    setError(null)
    sessionIdRef.current = null
    started.current = false
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    if (started.current) return
    started.current = true

    let cancelled = false

    ;(async () => {
      try {
        setPhase('qr')
        setError(null)
        const pkg = await buildCrewAckPackagePdf(permit, resolveUser, userDirectory)
        if (cancelled) return

        const pdfBytes = Uint8Array.from(atob(pkg.base64), (ch) => ch.charCodeAt(0))
        if (useServer) {
          const doc = await fetchCrewAckDocument(permit.id, {
            documentHash: pkg.documentHash,
            pdfByteLength: pdfBytes.length,
          })
          if (cancelled) return
          sessionIdRef.current = doc.sessionId
        }

        const session = await startSigexQrSigning({
          description: `NOVA Safety — ${crew.label}`,
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

        if (cancelled) return
        setQrSrc(`data:image/png;base64,${session.qrCodeBase64}`)
        setMobileLink(session.eGovMobileLaunchLink)

        const cmsBase64 = await session.waitForSignature(() => {
          if (!cancelled) setPhase('waiting')
        })

        if (cancelled) return
        setPhase('submitting')

        let stored: StoredCrewAckSignature
        if (useServer) {
          if (!sessionIdRef.current) {
            throw new Error(m.signServerUnavailableAck)
          }
          stored = await submitCrewAcknowledgmentToServer(
            sessionIdRef.current,
            cmsBase64,
          )
          await refresh()
        } else {
          stored = {
            signedAtIso: new Date().toISOString(),
            signedByUid: signerUid,
            signedByDisplayName: signerName,
            documentHash: pkg.documentHash,
            cmsBase64,
            provider: 'egov_mobile',
          }
        }

        notifySigningInvitesRefresh()
        onSigned(stored)
        setPhase('done')
      } catch (e) {
        if (cancelled || isSigexUserCancel(e)) {
          onClose()
          return
        }
        setPhase('error')
        setError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    open,
    onClose,
    onSigned,
    permit,
    refresh,
    resolveUser,
    signerName,
    signerUid,
    useServer,
    userDirectory,
    reset,
    m,
    c.document,
    c.na,
    crew.documentAbrRisk,
    crew.label,
  ])

  if (!open) return null

  return (
    <div className="egov-modal-backdrop" role="dialog" aria-modal="true">
      <div className="egov-modal card">
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
        {!online && <p className="alert error">{ui.needInternet}</p>}
        {error && <p className="alert error">{error}</p>}
        {qrSrc && phase !== 'done' && (
          <div className="egov-qr-wrap">
            <img src={qrSrc} alt={ui.approveEgov} className="egov-qr-img" />
          </div>
        )}
        {mobileLink && phase === 'waiting' && (
          <p className="small" style={{ textAlign: 'center' }}>
            <a href={mobileLink} target="_blank" rel="noreferrer">
              eGov Mobile
            </a>
          </p>
        )}
        {phase === 'waiting' && (
          <p className="strong small" role="status" style={{ textAlign: 'center' }}>
            {ui.waitingDefault}
          </p>
        )}
        {phase === 'submitting' && (
          <p className="small" style={{ textAlign: 'center' }}>
            {c.saving}
          </p>
        )}
        {phase === 'done' && (
          <p className="small" style={{ textAlign: 'center' }}>
            {ui.signed}
          </p>
        )}
        <div className="btn-row actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            {c.close}
          </button>
        </div>
      </div>
    </div>
  )
}
