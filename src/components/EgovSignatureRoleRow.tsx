import { useState } from 'react'
import type { Permit, DemoUser } from '../types/domain'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import { EGOV_ROLE_LABELS } from '../types/egovSignature'
import { EgovQrSignModal } from './EgovQrSignModal'
import { isRoleSigned } from '../lib/signatureStatus'
import {
  isPermitSigningRejected,
  rejectionActorLabel,
  rejectionSignerRole,
} from '../lib/permitRejectionDisplay'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'

export function EgovSignatureRoleRow(props: {
  permit: Permit
  role: EgovSignRole
  actor: DemoUser
  canSign: boolean
  stepTitle?: string
  waitingMessage?: string | null
  canReject?: boolean
  onReject?: () => void
  onSaveSignature: (sig: StoredEgovSignature) => void
  resolveUser?: (uid: string) => DemoUser | undefined
}) {
  const {
    permit,
    role,
    actor,
    canSign,
    stepTitle,
    waitingMessage,
    canReject,
    onReject,
    onSaveSignature,
    resolveUser,
  } = props
  const { online } = useNetwork()
  const { t } = useLanguage()
  const ui = t.signingUi
  const [modalOpen, setModalOpen] = useState(false)
  const signed = isRoleSigned(permit, role)
  const egov = permit.egovSignatures?.[role]
  const rejected = isPermitSigningRejected(permit)
  const rejectedRole = rejectionSignerRole(permit)
  const isRejectedStep = rejected && rejectedRole === role

  return (
    <div className="egov-sign-row">
      <div className="egov-sign-row__head">
        <span className="strong">{stepTitle ?? EGOV_ROLE_LABELS[role]}</span>
        {signed ? (
          <span className="badge status-issued">{ui.signed}</span>
        ) : isRejectedStep ? (
          <span className="badge status-rejected">{ui.rejected}</span>
        ) : rejected ? (
          <span className="badge status-rejected">{ui.cancelled}</span>
        ) : (
          <span className="badge status-on_approval">{ui.awaitingEsigh}</span>
        )}
      </div>

      {egov && (
        <p className="muted xsmall" style={{ margin: '0.35rem 0' }}>
          {egov.signedByDisplayName}
          {egov.signerIin ? ` · IIN ${egov.signerIin}` : ''} ·{' '}
          {new Date(egov.signedAtIso).toLocaleString()} ·{' '}
          {egov.documentFormat === 'pdf' ? 'PDF' : 'TEXT'} · hash{' '}
          {egov.documentHash.slice(0, 12)}…
          {egov.sigexVerified ? ' · SIGEX ✓' : ''}
        </p>
      )}

      {canSign && !signed && !rejected && (
        <>
          {!online && (
            <p className="muted xsmall">{ui.needInternet}</p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn primary small"
              disabled={!online}
              onClick={() => setModalOpen(true)}
            >
              {ui.approveEgov}
            </button>
            {canReject && onReject && (
              <button type="button" className="btn ghost small" onClick={onReject}>
                {ui.reject}
              </button>
            )}
          </div>
        </>
      )}

      {!canSign && !signed && rejected && (
        <div className="alert error xsmall" style={{ marginTop: '0.35rem' }}>
          <strong>
            {isRejectedStep
              ? permit.lastRejection?.byUid === actor.id
                ? ui.youRejected
                : ui.packageRejected
              : ui.approvalCancelled}
          </strong>
          <p className="small" style={{ margin: '0.25rem 0 0' }}>
            {permit.lastRejection?.comment.trim() || ui.reasonNotSpecified}
          </p>
          <p className="muted xsmall" style={{ margin: '0.25rem 0 0' }}>
            {rejectionActorLabel(permit, resolveUser ?? (() => undefined))}
          </p>
        </div>
      )}

      {!canSign && !signed && !rejected && (
        <p className="muted xsmall">
          {waitingMessage ?? ui.waitingDefault}
        </p>
      )}

      <EgovQrSignModal
        open={modalOpen}
        permit={permit}
        role={role}
        signerUid={actor.id}
        signerName={actor.displayName}
        onClose={() => setModalOpen(false)}
        onSigned={(sig) => {
          setModalOpen(false)
          onSaveSignature(sig)
        }}
      />
    </div>
  )
}
