import type { ReactNode } from 'react'
import type { Permit } from '../types/domain'
import type { DemoUser } from '../types/domain'
import {
  crewAckBlocksRole,
  displayRoleSigned,
  nextRoleToSign,
  signingRoleOrder,
  approvalStepLabel,
} from '../lib/approvalSequence'
import { isRoleSigned } from '../lib/signatureStatus'
import { buildPermitCrewRows } from '../lib/permitCrewRows'
import {
  isPermitSigningRejected,
  rejectionSignerRole,
} from '../lib/permitRejectionDisplay'
import { PermitRejectionNotice } from './PermitRejectionNotice'

type Props = {
  permit: Permit
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory?: DemoUser[]
  /** Кнопка ознакомления для работника бригады (eGov). */
  crewAckAction?: ReactNode
  /** Кнопка отклонения пакета (доступна всем участникам на согласовании). */
  rejectAction?: ReactNode
  variant?: 'card' | 'inline'
  /** Скрыть блок «кто отклонил», если родитель уже показывает его. */
  showRejectionNotice?: boolean
}

function stepStatus(
  signed: boolean,
  active: boolean,
  rejected: boolean,
  isRejectedStep: boolean,
): string {
  if (signed) return 'Согласовано ЭЦП'
  if (isRejectedStep) return 'Отклонено'
  if (rejected) return 'Отменено'
  if (active) return 'Сейчас'
  return 'Ожидает ЭЦП'
}

export function PermitOnApprovalSummary({
  permit,
  resolveUser,
  userDirectory = [],
  crewAckAction,
  rejectAction,
  variant = 'card',
  showRejectionNotice = true,
}: Props) {
  const crew = buildPermitCrewRows(permit, resolveUser, userDirectory)
  const currentStep = nextRoleToSign(permit, userDirectory)
  const rejected = isPermitSigningRejected(permit)
  const rejectedRole = rejectionSignerRole(permit)
  const performerSigned = isRoleSigned(permit, 'performer', userDirectory)
  const signingRoles = signingRoleOrder(permit)

  const inner = (
    <div className={variant === 'inline' ? 'permit-approval-summary permit-approval-summary--inline' : 'permit-approval-summary'}>
      {rejected && showRejectionNotice ? (
        <PermitRejectionNotice
          permit={permit}
          resolveUser={resolveUser}
          className="permit-approval-summary__rejection"
        />
      ) : null}
      {rejectAction ? (
        <div className="permit-approval-summary__reject">{rejectAction}</div>
      ) : null}
      <div className="permit-approval-summary__block">
        <h3 className="permit-approval-summary__title">Согласование</h3>
        <p className="muted small" style={{ marginTop: 0 }}>
          Очередь подписания ЭЦП:{' '}
          {signingRoles
            .map((role) => approvalStepLabel(role, permit, resolveUser).replace(/^Шаг \d+: /, ''))
            .join(' → ')}
          .
        </p>
        <ol className="permit-approval-summary__steps">
          {signingRoles.map((role) => {
            const signed = displayRoleSigned(permit, role, userDirectory)
            const active = !rejected && currentStep === role
            const isRejectedStep = rejected && rejectedRole === role
            const blockedByCrew =
              !signed && performerSigned && crewAckBlocksRole(permit, role, userDirectory)
            return (
              <li
                key={role}
                className={[
                  'permit-approval-summary__step',
                  signed ? 'is-signed' : '',
                  active ? 'is-active' : '',
                  isRejectedStep ? 'is-rejected' : '',
                  rejected && !signed && !isRejectedStep ? 'is-cancelled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="permit-approval-summary__step-label">
                  {approvalStepLabel(role, permit, resolveUser)}
                </span>
                <span className="permit-approval-summary__step-status">
                  {blockedByCrew
                    ? 'После ознакомления бригады'
                    : stepStatus(signed, active, rejected, isRejectedStep)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="permit-approval-summary__block" id="crew-ack-section">
        <h3 className="permit-approval-summary__title">
          Работники — ознакомление с АБР и оценкой рисков
        </h3>
        {!performerSigned ? (
          <p className="muted small" style={{ margin: 0 }}>
            Ознакомление откроется после подписи производителя работ (шаг 1).
          </p>
        ) : crew.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            Список работников не указан.
          </p>
        ) : (
          <ul className="permit-approval-summary__crew">
            {crew.map((row) => (
              <li
                key={row.id}
                className={row.acknowledged ? 'is-acked' : ''}
              >
                <span className="permit-approval-summary__crew-name">
                  {row.fullName}
                </span>
                {row.badgeNo ? (
                  <span className="muted xsmall"> · № {row.badgeNo}</span>
                ) : null}
                {row.dateIso ? (
                  <span className="muted xsmall"> · {row.dateIso}</span>
                ) : null}
                <span
                  className={[
                    'permit-approval-summary__crew-ack',
                    row.acknowledged ? 'is-ok' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {row.acknowledged ? 'ознакомлен' : 'ожидает ознакомления'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {crewAckAction ? (
          <div className="permit-approval-summary__crew-action">{crewAckAction}</div>
        ) : null}
      </div>
    </div>
  )

  if (variant === 'inline') return inner

  return (
    <section className={`card${rejected ? ' rejected-permits-panel rejected-permits-panel--single' : ''}`} style={{ marginBottom: '1rem' }}>
      {rejected ? (
        <header className="rejected-permits-panel__header">
          <span className="rejected-permits-panel__badge" aria-hidden>
            ✕
          </span>
          <div>
            <h2 className="rejected-permits-panel__title" style={{ marginTop: 0 }}>
              Согласование отклонено
            </h2>
          </div>
        </header>
      ) : (
        <h2 style={{ marginTop: 0 }}>
          {permit.status === 'on_approval'
            ? 'Статус согласования НДПР'
            : 'Согласование НДПР (завершено)'}
        </h2>
      )}
      {inner}
    </section>
  )
}
