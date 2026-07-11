import type { DemoUser, Permit } from '../types/domain'
import { uidMatchesAccount } from './permitAccess'
import { canUserTriggerStatus, validateTransition } from './transitions'
import { localeMessages } from '../i18n/getLocale'
import { permitSigningPhaseActive } from './approvalSequence'
import { permitRequiresErtApproval } from './fireWorkApproval'
import { permitterOnApprovalUnlocked } from './permitterApprovalGate'
import { permitterPreWorkAllowsSign } from './permitterPreWorkHints'
import { isRoleSigned } from './signatureStatus'
import { allCrewAcknowledged } from './crewAckComplete'
import { ertGasTestComplete } from './ertGasTestHints'

export type ApprovalAction =
  | 'sign_performer'
  | 'fill_permitter_pre_work'
  | 'sign_permitter'
  | 'sign_issuer'
  | 'sign_lead_expert'
  | 'sign_ert'
  | 'issue_permit'

export interface PendingApprovalItem {
  permit: Permit
  action: ApprovalAction
  label: string
  priority: number
}

function pushSignItem(
  items: PendingApprovalItem[],
  p: Permit,
  user: DemoUser,
  directory: DemoUser[],
  opts: {
    role: DemoUser['role']
    assigneeUid: string
    signed: boolean
    action: ApprovalAction
    labelSelf: string
    labelCoord: string
    priority: number
  },
) {
  if (opts.signed) return
  if (user.role === 'coordinator') {
    items.push({
      permit: p,
      action: opts.action,
      label: opts.labelCoord,
      priority: opts.priority,
    })
    return
  }
  if (user.role === opts.role && uidMatchesAccount(opts.assigneeUid, user, directory)) {
    items.push({
      permit: p,
      action: opts.action,
      label: opts.labelSelf,
      priority: opts.priority,
    })
  }
}

/** Наряды «На согласовании», где текущему пользователю нужно действие. */
export function pendingApprovalsForUser(
  permits: Permit[],
  user: DemoUser,
  resolveUser?: (uid: string) => { displayName: string } | undefined,
  directory: DemoUser[] = [],
): PendingApprovalItem[] {
  void resolveUser
  const items: PendingApprovalItem[] = []

  for (const p of permits) {
    if (!permitSigningPhaseActive(p)) continue

    pushSignItem(items, p, user, directory, {
      role: 'performer',
      assigneeUid: p.performerUid,
      signed: isRoleSigned(p, 'performer', directory),
      action: 'sign_performer',
      labelSelf: 'Подписать ЭЦП (производитель / составитель)',
      labelCoord: 'Ожидает ЭЦП производителя работ',
      priority: 0,
    })

    if (
      isRoleSigned(p, 'performer', directory) &&
      allCrewAcknowledged(p, directory) &&
      permitRequiresErtApproval(p) &&
      ertGasTestComplete(p)
    ) {
      pushSignItem(items, p, user, directory, {
        role: 'ert',
        assigneeUid: p.ertUid ?? 'u-ert',
        signed: isRoleSigned(p, 'ert', directory),
        action: 'sign_ert',
        labelSelf: 'Подписать ЭЦП (ПАС / ERT)',
        labelCoord: 'Ожидает ЭЦП ПАС (ERT)',
        priority: 1,
      })
    }

    if (permitterOnApprovalUnlocked(p, directory)) {
      const preWorkReady = permitterPreWorkAllowsSign(p)
      const isAssignedPermitter =
        user.role === 'permitter' && uidMatchesAccount(p.permitterUid, user, directory)
      if (
        isAssignedPermitter &&
        !preWorkReady &&
        !isRoleSigned(p, 'permitter', directory)
      ) {
        items.push({
          permit: p,
          action: 'fill_permitter_pre_work',
          label: localeMessages().preWorkCheck.tasksTitle,
          priority: 2,
        })
      } else {
        pushSignItem(items, p, user, directory, {
          role: 'permitter',
          assigneeUid: p.permitterUid,
          signed: isRoleSigned(p, 'permitter', directory),
          action: 'sign_permitter',
          labelSelf: 'Поставить подпись допускающего',
          labelCoord: 'Ожидает подпись допускающего',
          priority: 2,
        })
      }
    }

    pushSignItem(items, p, user, directory, {
      role: 'issuer',
      assigneeUid: p.issuerUid,
      signed: isRoleSigned(p, 'issuer', directory),
      action: 'sign_issuer',
      labelSelf: 'Поставить подпись выдающего',
      labelCoord: 'Ожидает подпись выдающего',
      priority: 3,
    })

    if (p.category === 1) {
      pushSignItem(items, p, user, directory, {
        role: 'leadExpert',
        assigneeUid: p.leadExpertUid,
        signed: isRoleSigned(p, 'leadExpert', directory),
        action: 'sign_lead_expert',
        labelSelf: 'Поставить подпись утверждающего НД',
        labelCoord: 'Ожидает подпись утверждающего НД',
        priority: 4,
      })
    }

    const signaturesComplete =
      isRoleSigned(p, 'performer', directory) &&
      (!permitRequiresErtApproval(p) || isRoleSigned(p, 'ert', directory)) &&
      allCrewAcknowledged(p, directory) &&
      isRoleSigned(p, 'permitter', directory) &&
      isRoleSigned(p, 'issuer', directory) &&
      (p.category !== 1 || isRoleSigned(p, 'leadExpert', directory))

    if (
      signaturesComplete &&
      canUserTriggerStatus(p, 'issued', user.role) &&
      validateTransition(p, 'issued').ok &&
      (user.role === 'coordinator' || uidMatchesAccount(p.issuerUid, user, directory))
    ) {
      items.push({
        permit: p,
        action: 'issue_permit',
        label:
          user.role === 'coordinator'
            ? localeMessages().approval.hints.issueCoordinator
            : localeMessages().approval.hints.issueIssuer,
        priority: 5,
      })
    }
  }

  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return b.permit.updatedAtIso.localeCompare(a.permit.updatedAtIso)
  })
}

export function pendingForPermit(
  permit: Permit,
  user: DemoUser,
  resolveUser?: (uid: string) => { displayName: string } | undefined,
): PendingApprovalItem[] {
  return pendingApprovalsForUser([permit], user, resolveUser)
}

export function approvalActionHint(action: ApprovalAction): string {
  switch (action) {
    case 'sign_performer':
      return 'Откройте карточку → подпись производителя работ (составителя пакета).'
    case 'fill_permitter_pre_work':
      return 'Откройте карточку → заполните раздел 3 (проверки на рабочем месте) и сохраните.'
    case 'sign_permitter':
      return 'Раздел «Подписи и согласования» → отметьте подпись допускающего.'
    case 'sign_issuer':
      return 'Раздел «Подписи и согласования» → отметьте подпись выдающего.'
    case 'sign_lead_expert':
      return 'Раздел «Подписи и согласования» → отметьте подпись утверждающего НД.'
    case 'sign_ert':
      return 'После заполнения и сохранения таблицы газотеста → «Согласовать (ЭЦП eGov)».'
    case 'issue_permit':
      return 'Все этапы согласования завершены — наряд будет выдан автоматически после последней подписи.'
    default:
      return ''
  }
}
