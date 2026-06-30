import { useCallback, useEffect, useRef, useState } from 'react'
import type { Permit } from '../types/domain'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import { profileNameForSigningCheck } from '../lib/signerIdentityHint'
import { buildSigningPackagePdf } from '../lib/buildSigningPackagePdf'
import { buildSigningPayload } from '../lib/buildSigningPayload'
import {
  fetchSigningDocument,
  submitEgovSignatureToServer,
} from '../lib/egovFunctions'
import { notifySigningInvitesRefresh } from '../lib/refreshSigningInvites'
import {
  isSigexUserCancel,
  startSigexQrSigning,
} from '../lib/sigexQrSigning'
import { useSession } from '../context/SessionContext'
import { useSigningSettings } from '../hooks/useSigningSettings'
import { useLanguage } from '../context/LanguageContext'

type Phase = 'idle' | 'qr' | 'waiting' | 'submitting' | 'done' | 'error'

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
  const useServerPdf = authMode === 'firebase'

  const [phase, setPhase] = useState<Phase>('idle')
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [mobileLink, setMobileLink] = useState<string | null>(null)
  const [businessLink, setBusinessLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const started = useRef(false)

  const reset = useCallback(() => {
    setPhase('idle')
    setQrSrc(null)
    setMobileLink(null)
    setBusinessLink(null)
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

        let dataBase64: string
        let documentHash: string
        let isPdf = false

        if (useServerPdf) {
          const pkg = await buildSigningPackagePdf(permit, resolveUser, userDirectory, {
            role,
            signerName,
          })
          if (cancelled) return
          if (!pkg.pdfBase64) {
            throw new Error(m.pdfPackageFailed)
          }
          dataBase64 = pkg.pdfBase64
          documentHash = pkg.documentHash
          isPdf = true
          const pdfBytes = Uint8Array.from(atob(pkg.pdfBase64), (c) => c.charCodeAt(0))
          const doc = await fetchSigningDocument(permit.id, role, {
            documentHash: pkg.documentHash,
            pdfByteLength: pdfBytes.length,
          })
          if (cancelled) return
          sessionIdRef.current = doc.sessionId
        } else {
          const payload = await buildSigningPayload(permit, role, signerUid, signerName)
          dataBase64 = payload.dataBase64
          documentHash = payload.documentHash
        }

        const session = await startSigexQrSigning({
          description: `NOVA SAFETY AI — ${t.egovRoles[role]}`,
          documentTitle: `${m.wpTitle} ${permit.registrationRefNo || permit.id.slice(0, 8)}`,
          dataBase64,
          isPdf,
          meta: [
            { name: m.regNoField, value: permit.registrationRefNo || c.na },
            { name: m.roleField, value: t.egovRoles[role] },
            { name: 'Hash', value: documentHash.slice(0, 16) + '…' },
            { name: m.formatField, value: isPdf ? 'PDF' : 'TEXT' },
          ],
          sigexBaseUrl: import.meta.env.VITE_SIGEX_BASE_URL,
        })

        if (cancelled) return

        setQrSrc(`data:image/png;base64,${session.qrCodeBase64}`)
        setMobileLink(session.eGovMobileLaunchLink)
        setBusinessLink(session.eGovBusinessLaunchLink)

        const cmsBase64 = await session.waitForSignature(() => {
          if (!cancelled) setPhase('waiting')
        })

        if (cancelled) return

        if (useServerPdf) {
          if (!sessionIdRef.current) {
            throw new Error(m.signServerUnavailable)
          }
          setPhase('submitting')
          const stored = await submitEgovSignatureToServer(
            sessionIdRef.current,
            cmsBase64,
          )
          await refresh()
          notifySigningInvitesRefresh()
          setPhase('done')
          onSigned(stored)
        } else {
          const stored: StoredEgovSignature = {
            role,
            signedAtIso: new Date().toISOString(),
            signedByUid: signerUid,
            signedByDisplayName: signerName,
            documentHash,
            documentFormat: isPdf ? 'pdf' : 'text',
            cmsBase64,
            provider: 'egov_mobile',
          }
          setPhase('done')
          onSigned(stored)
          notifySigningInvitesRefresh()
        }
      } catch (e) {
        if (cancelled) return
        if (isSigexUserCancel(e)) {
          setError(m.signCancelled)
        } else {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
        }
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
    onSigned,
    reset,
    useServerPdf,
    refresh,
    resolveUser,
    userDirectory,
    m,
    c.na,
    t.egovRoles,
  ])

  const signerProfile = resolveUser(signerUid)

  if (!open) return null

  return (
    <div className="egov-modal-backdrop" role="dialog" aria-modal="true">
      <div className="egov-modal card">
        <div className="egov-modal__header">
          <h2 style={{ margin: 0 }}>{ui.approveEgov}</h2>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label={m.closeAria}>
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
        {!verifyEgovFio && useServerPdf && (
          <p className="small muted" style={{ marginTop: '-0.25rem' }}>
            {m.verifyingEsigh}
          </p>
        )}

        {phase === 'qr' && qrSrc && (
          <>
            <p className="small">
              {t.docKit.approvalPackage}
            </p>
            <div className="egov-qr-wrap">
              <img src={qrSrc} alt={ui.approveEgov} className="egov-qr-img" />
            </div>
            {(mobileLink || businessLink) && (
              <div className="btn-row" style={{ marginTop: '0.75rem' }}>
                {mobileLink && (
                  <a className="btn ghost small" href={mobileLink}>
                    eGov Mobile
                  </a>
                )}
                {businessLink && (
                  <a className="btn ghost small" href={businessLink}>
                    eGov Business
                  </a>
                )}
              </div>
            )}
          </>
        )}

        {phase === 'waiting' && (
          <p className="strong" role="status">
            {ui.waitingDefault}
          </p>
        )}

        {phase === 'submitting' && (
          <p className="strong" role="status">
            {verifyEgovFio ? m.verifyingEsighAndFio : m.verifyingEsigh}
          </p>
        )}

        {phase === 'idle' && !error && (
          <p className="muted">{c.formingPdf}</p>
        )}

        {phase === 'done' && (
          <p className="strong" role="status">
            {ui.signed}
          </p>
        )}

        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}

        <div className="btn-row actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {c.close}
          </button>
        </div>
      </div>
    </div>
  )
}
