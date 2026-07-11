import { useCallback, useEffect, useRef, useState } from 'react'
import type { DemoUser, Permit } from '../types/domain'
import { buildAbrDailyAckPdf } from '../lib/buildAbrDailyAckPdf'
import { isSigexUserCancel, startSigexQrSigning } from '../lib/sigexQrSigning'
import {
  isNcaLayerAvailable,
  isNcaLayerUserCancel,
  signBase64WithNcaLayer,
} from '../lib/ncaLayerSigning'
import { EgovSignMethodTabs, type EgovSignTab } from './EgovSignMethodTabs'
import { NcaLayerSignPanel } from './NcaLayerSignPanel'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'
import type { AbrDailyAckEntry } from '../types/abrDailyAck'
import { buildAbrDailyAckEntry } from '../lib/abrDailyAck'
import { ROLE_LABELS } from '../types/domain'

type Phase = 'preparing' | 'qr' | 'waiting' | 'submitting' | 'done' | 'error'

type AbrDailyPackage = {
  base64: string
  documentHash: string
}

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

  const [tab, setTab] = useState<EgovSignTab>('qr')
  const [phase, setPhase] = useState<Phase>('preparing')
  const [pkg, setPkg] = useState<AbrDailyPackage | null>(null)
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
    async (cmsBase64: string, provider: AbrDailyAckEntry['provider']) => {
      if (!pkg) throw new Error(m.pdfPackageFailed)
      setPhase('submitting')
      const roleLabel = ROLE_LABELS[actor.role] ?? actor.role
      const entry = buildAbrDailyAckEntry(actor, () => roleLabel, {
        cmsBase64,
        documentHash: pkg.documentHash,
        provider,
      })
      onSigned(entry)
      setPhase('done')
    },
    [pkg, actor, onSigned, m.pdfPackageFailed],
  )

  const startQrFlow = useCallback(async () => {
    if (!pkg || qrStarted.current) return
    qrStarted.current = true
    setError(null)
    setPhase('qr')

    try {
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
  }, [pkg, permit, dateIso, persistSignature, d.title, m, c.na])

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
    const roleLabel = ROLE_LABELS[actor.role] ?? actor.role

    ;(async () => {
      try {
        setPhase('preparing')
        setError(null)
        const built = await buildAbrDailyAckPdf(permit, actor, roleLabel, dateIso)
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
  }, [open, permit, actor, dateIso, reset])

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

        <EgovSignMethodTabs
          tab={tab}
          disabled={tabsDisabled}
          pkgReady={Boolean(pkg)}
          onTabChange={selectTab}
        />

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
            {c.saving}
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
