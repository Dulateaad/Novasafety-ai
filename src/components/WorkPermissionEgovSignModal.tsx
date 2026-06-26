import { useCallback, useEffect, useRef, useState } from 'react'
import type { Permit } from '../types/domain'
import type { StoredEgovSignature } from '../types/egovSignature'
import { buildWorkPermissionPdf } from '../lib/buildWorkPermissionPdf'
import { startSigexQrSigning, isSigexUserCancel } from '../lib/sigexQrSigning'
import { WORK_PERMISSION_SIGN_LABELS, type WorkPermissionDocument, type WorkPermissionSignRole } from '../types/workPermissions'
import { useLanguage } from '../context/LanguageContext'

type Phase = 'idle' | 'qr' | 'waiting' | 'done' | 'error'

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
  const [phase, setPhase] = useState<Phase>('idle')
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const reset = useCallback(() => {
    setPhase('idle')
    setQrSrc(null)
    setError(null)
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
        const { base64, documentHash } = await buildWorkPermissionPdf(doc)
        if (cancelled) return
        const session = await startSigexQrSigning({
          description: `NOVA — ${WORK_PERMISSION_SIGN_LABELS[role]}`,
          documentTitle: doc.title,
          dataBase64: base64,
          isPdf: true,
          meta: [
            { name: c.permit, value: permit.registrationRefNo || permit.id.slice(0, 8) },
            { name: c.permission, value: doc.kind },
            { name: c.role, value: WORK_PERMISSION_SIGN_LABELS[role] },
          ],
          sigexBaseUrl: import.meta.env.VITE_SIGEX_BASE_URL,
        })
        if (cancelled) return
        setQrSrc(`data:image/png;base64,${session.qrCodeBase64}`)
        const cmsBase64 = await session.waitForSignature(() => {
          if (!cancelled) setPhase('waiting')
        })
        if (cancelled) return
        const stored: StoredEgovSignature = {
          role: role as StoredEgovSignature['role'],
          signedAtIso: new Date().toISOString(),
          signedByUid: signerUid,
          signedByDisplayName: signerName,
          documentHash,
          documentFormat: 'pdf',
          cmsBase64,
          provider: 'egov_mobile',
        }
        setPhase('done')
        onSigned(stored)
      } catch (e) {
        if (cancelled) return
        if (isSigexUserCancel(e)) setError(m.signCancelled)
        else setError(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, permit, doc, role, signerUid, signerName, onSigned, reset, m.signCancelled, c.permit, c.permission, c.role])

  if (!open) return null

  return (
    <div className="egov-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="egov-modal card" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{ui.approveEgov} — {WORK_PERMISSION_SIGN_LABELS[role]}</h2>
        <p className="muted small">{doc.title}</p>
        {phase === 'qr' && qrSrc ? (
          <img src={qrSrc} alt={ui.approveEgov} className="egov-qr-img" />
        ) : null}
        {phase === 'waiting' ? <p className="muted">{ui.waitingDefault}</p> : null}
        {phase === 'done' ? <p className="muted">{ui.signed}</p> : null}
        {error ? <p className="small" style={{ color: 'var(--danger)' }}>{error}</p> : null}
        <button type="button" className="btn ghost" onClick={onClose}>
          {c.close}
        </button>
      </div>
    </div>
  )
}
