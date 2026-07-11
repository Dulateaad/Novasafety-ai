import type { DemoUser, Permit } from '../types/domain'
import {
  isPermitSigningRejected,
  rejectionActorLabel,
  rejectionRejectorName,
  rejectionRejectorRoleLabel,
} from '../lib/permitRejectionDisplay'

type Props = {
  permit: Permit
  resolveUser: (uid: string) => DemoUser | undefined
  compact?: boolean
}

export function PermitRejectionStrip({ permit, resolveUser, compact }: Props) {
  if (!isPermitSigningRejected(permit) || !permit.lastRejection) return null

  const name = rejectionRejectorName(permit, resolveUser)
  const role = rejectionRejectorRoleLabel(permit)
  const comment = permit.lastRejection.comment.trim()

  if (compact) {
    return (
      <p className="permit-rejection-strip permit-rejection-strip--compact">
        <span className="permit-rejection-strip__label">Отклонил:</span>{' '}
        <strong>{name}</strong>
        <span className="muted"> · {role}</span>
        {comment ? <span className="permit-rejection-strip__comment"> — {comment}</span> : null}
      </p>
    )
  }

  return (
    <div className="permit-rejection-strip">
      <div className="permit-rejection-strip__who">
        <span className="permit-rejection-strip__label">Отклонил</span>
        <strong className="permit-rejection-strip__name">{name}</strong>
        <span className="permit-rejection-strip__role">{role}</span>
      </div>
      {comment ? <p className="permit-rejection-strip__reason">{comment}</p> : null}
      <p className="permit-rejection-strip__meta muted xsmall">
        {rejectionActorLabel(permit, resolveUser)} ·{' '}
        {new Date(permit.lastRejection.atIso).toLocaleString('ru-RU')}
      </p>
    </div>
  )
}
