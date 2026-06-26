import { useState } from 'react'
import type { Permit, DemoUser } from '../types/domain'
import type { StoredCrewAckSignature } from '../types/crewAck'
import { crewAckBlockedReason } from '../lib/crewAckEligibility'
import { CrewAckSignModal } from './CrewAckSignModal'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'

export function CrewAckSignRow(props: {
  permit: Permit
  actor: DemoUser
  canSign: boolean
  onSigned: (sig: StoredCrewAckSignature) => void
}) {
  const { permit, actor, canSign, onSigned } = props
  const { online } = useNetwork()
  const { t } = useLanguage()
  const crew = t.crew
  const ui = t.signingUi
  const a = t.approval
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const row = permit.executors.find((ex) => ex.userUid === actor.id)
  const signed = row?.briefingAcknowledged === true
  const sig = permit.crewAckSignatures?.[actor.id]

  const blocked = crewAckBlockedReason(permit)

  return (
    <div className="egov-sign-row crew-ack-sign-row">
      <div className="crew-ack-sign-row__main">
        <div className="egov-sign-row__head">
          <span className="strong">{crew.label}</span>
          {signed ? (
            <span className="badge status-issued">{a.crewMemberAcked}</span>
          ) : (
            <span className="badge status-on_approval">{a.crewMemberPending}</span>
          )}
        </div>

        {sig && (
          <p className="muted xsmall" style={{ margin: '0.35rem 0 0' }}>
            {sig.signedByDisplayName}
            {sig.signerIin ? ` · IIN ${sig.signerIin}` : ''} ·{' '}
            {new Date(sig.signedAtIso).toLocaleString()}
          </p>
        )}

        {!canSign && !signed && (
          <p className="muted xsmall" style={{ margin: '0.35rem 0 0' }}>
            {blocked ?? crew.blockedDefault}
          </p>
        )}
      </div>

      {canSign && !signed && (
        <div className="crew-ack-sign-row__actions">
          {!online && (
            <p className="muted xsmall" style={{ margin: 0, textAlign: 'right' }}>
              {ui.needInternet}
            </p>
          )}
          <label className="check check--crew-ack">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>{crew.confirmation}</span>
          </label>
          <button
            type="button"
            className="btn primary small"
            disabled={!online || !confirmed}
            onClick={() => setModalOpen(true)}
          >
            {ui.approveEgov}
          </button>
        </div>
      )}

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
    </div>
  )
}
