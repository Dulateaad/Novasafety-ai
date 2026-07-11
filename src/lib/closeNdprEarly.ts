import type { DemoUser, Permit } from '../types/domain'
import { uidMatchesAccount } from './permitAccess'
import { canUserTriggerStatus } from './transitions'


/** Производитель работ по этому наряду (составитель пакета). */
export function isPermitProducer(
  permit: Permit,
  actor: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  if (actor.role !== 'performer') return false
  const assigned = permit.performerUid?.trim()
  if (!assigned) return true
  return uidMatchesAccount(assigned, actor, directory)
}

export function canFillPermissionClosure(
  permit: Permit,
  actor: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  return permit.status === 'closed' && isPermitProducer(permit, actor, directory)
}

export function permissionClosureDeniedReason(
  permit: Permit,
  actor: DemoUser,
  directory: DemoUser[] = [],
): string | null {
  if (canFillPermissionClosure(permit, actor, directory)) return null
  if (permit.status !== 'closed') {
    return 'Раздел закрытия доступен после закрытия НДПР.'
  }
  if (actor.role !== 'performer') {
    return 'Заполняет производитель работ, указанный в наряде.'
  }
  if (permit.performerUid && !uidMatchesAccount(permit.performerUid, actor, directory)) {
    return 'Вы не указаны как производитель работ в этом наряде.'
  }
  return null
}

const EARLY_CLOSE_STATUSES = new Set<Permit['status']>(['issued', 'in_progress', 'suspended'])

/** НДПР полностью согласован и выдан — доступны закрытие, продление, бригада и замена производителя. */
export const POST_APPROVAL_STATUSES = EARLY_CLOSE_STATUSES

export function isPermitPostApproval(permit: Permit): boolean {
  return POST_APPROVAL_STATUSES.has(permit.status)
}

/** Производитель (или координатор) может досрочно закрыть выданный / выполняемый НДПР. */
export function canCloseNdprEarly(
  permit: Permit,
  actor: DemoUser,
  directory: DemoUser[] = [],
): boolean {
  if (!EARLY_CLOSE_STATUSES.has(permit.status)) return false
  if (!canUserTriggerStatus(permit, 'closed', actor.role)) return false
  if (actor.role === 'coordinator') return true
  if (isPermitProducer(permit, actor, directory)) return true
  return false
}

export function closeNdprEarlyDeniedReason(
  permit: Permit,
  actor: DemoUser,
  directory: DemoUser[] = [],
): string | null {
  if (canCloseNdprEarly(permit, actor, directory)) return null
  if (actor.role !== 'performer' && actor.role !== 'coordinator') {
    return 'Досрочное закрытие доступно производителю работ или координатору.'
  }
  if (permit.status === 'on_approval') {
    return 'Наряд ещё на согласовании — закрыть можно после выдачи.'
  }
  if (permit.status === 'in_progress') {
    return 'Закрытие доступно производителю работ или координатору.'
  }
  if (permit.status === 'draft') {
    return 'Черновик нельзя закрыть — отправьте на согласование или удалите.'
  }
  if (['closed', 'archived', 'annulled'].includes(permit.status)) {
    return 'Наряд уже закрыт или аннулирован.'
  }
  if (
    actor.role === 'performer' &&
    permit.performerUid &&
    !uidMatchesAccount(permit.performerUid, actor, directory)
  ) {
    return 'Вы не указаны как производитель работ в этом наряде.'
  }
  return 'Закрытие недоступно для текущего статуса наряда.'
}
