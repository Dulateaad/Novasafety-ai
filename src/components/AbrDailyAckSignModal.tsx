import { useCallback, useEffect, useRef, useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { buildAbrDailyAckPdf } from '../lib/buildAbrDailyAckPdf'
import { isSigexUserCancel, startSigexQrSigning } from '../lib/sigexQrSigning'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'
import type { AbrDailyAckEntry } from '../types/abrDailyAck'
import { buildAbrDailyAckEntry } from '../lib/abrDailyAck'
import { ROLE_LABELS } from '../types/domain'

type Phase = 'idle' | 'qr' | 'waiting' | 'submitting' | 'done' | 'error'

export function AbrDailyAckSignModal(props: {
  open: boolean
  permit: Permit
  actor: DemoUser
  dateIso: string
  onClose: () => void
  onSigned: (entry: AbrDailyAckEntry) => void
}) {
  const { open, permit, actor, dateIso, onClose, onSigned } = props
  const { online } = useNetwork()
  const { t } = useLanguage()
  const d = t.abrDailyAck
  const ui = t.signingUi
  const m = t.modals
  const c = t.common

  const [phase, setPhase] = useState<Phase>('idle')
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [mobileLink, setMobileLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const reset = useCallback(() => {
    setPhase('idle')
    setQrSrc(null)
    setMobileLink(null)
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
    const roleLabel = ROLE_LABELS[actor.role] ?? actor.role

    ;(async () => {
      try {
        setPhase('qr')
        setError(null)
        const pkg = await buildAbrDailyAckPdf(permit, actor, roleLabel, dateIso)
        if (cancelled) return

        const session = await startSigexQrSigning({
          description: `NOVA SAFETY AI — ${d.title}`,
          documentTitle: `${m.wpTitle} ${permit.registrationRefNo || permit.id.slice(0, 8)} · ${dateIso}`,
          dataBase64: pkg.base64,
          isPdf: true,
          meta: [
            { name: m.regNoField, value: permit.registrationRefNo || c.na },
            { name: d.colDate, value: dateIso },
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

        const entry = buildAbrDailyAckEntry(actor, (u) => ROLE_LABELS[u.role] ?? u.role, {
          cmsBase64,
          documentHash: pkg.documentHash,
          provider: 'egov_mobile',
        })

        onSigned(entry)
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
  }, [open, onClose, onSigned, permit, actor, dateIso, reset, d.title, m, c, ui])

  if (!open) return null

  return (
    <div className="egov-modal-backdrop" role="dialog" aria-modal="true">
      <div className="egov-modal card">
        <div className="egov-modal__header">
          <h2 style={{ margin: 0 }}>{d.title}</h2>
          <button type="button" className="btn ghost small" onClick={onClose} aria-label={m.closeAria}>
            ✕
          </button>
        </div>
        <p className="strong small" style={{ marginTop: 0 }}>
          {d.confirmation}
        </p>
        <p className="muted small">
          {ui.approveEgov} · {dateIso} · {m.wpTitle}{' '}
          {permit.registrationRefNo || c.na}
        </p>
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
