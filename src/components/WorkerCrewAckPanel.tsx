import { useState } from 'react'
import type { Permit, DemoUser } from '../types/domain'
import type { StoredCrewAckSignature } from '../types/crewAck'
import {
  ABR_LABEL,
  APP_TAGLINE,
  RISK_ASSESSMENT_LABEL,
} from '../config/branding'
import { crewAckBlockedReason } from '../lib/crewAckEligibility'
import { isExecutorCrewAckDone } from '../lib/crewAckComplete'
import { isRoleSigned } from '../lib/signatureStatus'
import { formatCrewCountLabel } from '../lib/permitPackageBrief'
import type { PermitPackageBrief } from '../lib/permitPackageBrief'
import { CrewAckSignModal } from './CrewAckSignModal'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'

export function WorkerCrewAckPanel(props: {
  permit: Permit
  actor: DemoUser
  brief: PermitPackageBrief | null
  canSign: boolean
  userDirectory?: DemoUser[]
  onSigned: (sig: StoredCrewAckSignature) => void
}) {
  const { permit, actor, brief, canSign, userDirectory = [], onSigned } = props
  const { online } = useNetwork()
  const { t, language } = useLanguage()
  const w = t.crewWorker
  const crew = t.crew
  const ui = t.signingUi
  const c = t.common

  const [modalOpen, setModalOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const signed = isExecutorCrewAckDone(permit, actor.id, userDirectory)
  const sig = permit.crewAckSignatures?.[actor.id]
  const blocked = crewAckBlockedReason(permit, userDirectory)
  const performerSigned = isRoleSigned(permit, 'performer', userDirectory)
  const regNo = permit.registrationRefNo || permit.id.slice(0, 8)
  const crewLabel = brief?.crewCount
    ? formatCrewCountLabel(brief.crewCount, language)
    : null

  const statusKind = signed
    ? 'done'
    : !performerSigned || blocked
      ? 'blocked'
      : canSign
        ? 'ready'
        : 'pending'

  return (
    <section className="worker-crew-ack" id="crew-ack-section">
      <div className="worker-crew-ack__hero">
        <div className="worker-crew-ack__eyebrow">{APP_TAGLINE}</div>
        <div className="worker-crew-ack__reg">
          {fillTemplate(w.regNo, { regNo })}
        </div>
        <h2 className="worker-crew-ack__title">{w.title}</h2>
        <p className="worker-crew-ack__subtitle">
          {fillTemplate(w.greeting, { name: actor.displayName })}
        </p>
        <div className="worker-crew-ack__meta">
          {brief?.siteName && brief.siteName !== c.na ? (
            <span className="worker-crew-ack__chip">{brief.siteName}</span>
          ) : null}
          {brief?.workKind ? (
            <span className="worker-crew-ack__chip">{brief.workKind}</span>
          ) : null}
          {crewLabel ? (
            <span className="worker-crew-ack__chip">{crewLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="worker-crew-ack__body">
        <div className={`worker-crew-ack__status worker-crew-ack__status--${statusKind}`}>
          <div className="worker-crew-ack__status-icon" aria-hidden>
            {signed ? '✓' : !performerSigned ? '1' : canSign ? '→' : '…'}
          </div>
          <div>
            <p className="worker-crew-ack__status-title">
              {signed
                ? w.signedTitle
                : !performerSigned
                  ? w.waitProducerTitle
                  : canSign
                    ? w.readyTitle
                    : w.pendingTitle}
            </p>
            <p className="worker-crew-ack__status-text">
              {signed
                ? w.signedHint
                : blocked && !signed
                  ? blocked
                  : canSign
                    ? w.readyHint
                    : w.pendingHint}
            </p>
            {signed && sig ? (
              <p className="worker-crew-ack__signed-meta">
                {sig.signedByDisplayName}
                {sig.signerIin ? ` · IIN ${sig.signerIin}` : ''} ·{' '}
                {new Date(sig.signedAtIso).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>

        {!signed ? (
          <>
            <ol className="worker-crew-ack__steps">
              <li className={`worker-crew-ack__step${performerSigned ? ' is-done' : ''}`}>
                <span className="worker-crew-ack__step-num">{performerSigned ? '✓' : '1'}</span>
                <p className="worker-crew-ack__step-label">{w.stepProducer}</p>
              </li>
              <li className="worker-crew-ack__step">
                <span className="worker-crew-ack__step-num">2</span>
                <p className="worker-crew-ack__step-label">{w.stepRead}</p>
              </li>
              <li className="worker-crew-ack__step">
                <span className="worker-crew-ack__step-num">3</span>
                <p className="worker-crew-ack__step-label">{w.stepSign}</p>
              </li>
            </ol>

            <div className="worker-crew-ack__docs">
              <p className="worker-crew-ack__docs-label">{w.documentsLabel}</p>
              <div className="worker-crew-ack__doc-list">
                <span className="worker-crew-ack__doc">
                  <span className="worker-crew-ack__doc-dot" />
                  {ABR_LABEL}
                </span>
                <span className="worker-crew-ack__doc">
                  <span className="worker-crew-ack__doc-dot" />
                  {RISK_ASSESSMENT_LABEL}
                </span>
              </div>
            </div>

            {canSign ? (
              <>
                {!online ? (
                  <p className="worker-crew-ack__offline">{ui.needInternet}</p>
                ) : null}
                <label className="worker-crew-ack__confirm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>{crew.confirmation}</span>
                </label>
                <button
                  type="button"
                  className="btn primary worker-crew-ack__cta"
                  disabled={!online || !confirmed}
                  onClick={() => setModalOpen(true)}
                >
                  {w.signButton}
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <CrewAckSignModal
        open={modalOpen}
        permit={permit}
        signerUid={actor.id}
        signerName={actor.displayName}
        onClose={() => setModalOpen(false)}
        onSigned={(signature) => {
          setModalOpen(false)
          onSigned(signature)
        }}
      />
    </section>
  )
}
