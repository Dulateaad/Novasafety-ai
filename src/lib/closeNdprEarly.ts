import type { DemoUser, Permit } from '../types/domain'
import { canUserTriggerStatus } from './transitions'


/** Производитель работ по этому наряду (составитель пакета). */
export function isPermitProducer(permit: Permit, actor: DemoUser): boolean {
  if (actor.role !== 'performer') return false
  const assigned = permit.performerUid?.trim()
  return !assigned || assigned === actor.id
}

export function canFillPermissionClosure(permit: Permit, actor: DemoUser): boolean {
  return permit.status === 'closed' && isPermitProducer(permit, actor)
}

export function permissionClosureDeniedReason(permit: Permit, actor: DemoUser): string | null {
  if (canFillPermissionClosure(permit, actor)) return null
  if (permit.status !== 'closed') {
    return 'Раздел закрытия доступен после закрытия НДПР.'
  }
  if (actor.role !== 'performer') {
    return 'Заполняет производитель работ, указанный в наряде.'
  }
  if (permit.performerUid && permit.performerUid !== actor.id) {
    return 'Вы не указаны как производитель работ в этом наряде.'
  }
  return null
}

const EARLY_CLOSE_STATUSES = new Set<Permit['status']>(['issued', 'in_progress', 'suspended'])

/** Производитель (или координатор) может досрочно закрыть выданный / выполняемый НДПР. */
export function canCloseNdprEarly(permit: Permit, actor: DemoUser): boolean {
  if (!EARLY_CLOSE_STATUSES.has(permit.status)) return false
  if (!canUserTriggerStatus(permit, 'closed', actor.role)) return false
  if (actor.role === 'coordinator') return true
  if (isPermitProducer(permit, actor)) return true
  return false
}

export function closeNdprEarlyDeniedReason(permit: Permit, actor: DemoUser): string | null {
  if (canCloseNdprEarly(permit, actor)) return null
  if (actor.role !== 'performer' && actor.role !== 'coordinator') {
    return 'Досрочное закрытие доступно производителю работ или координатору.'
  }
  if (permit.status === 'on_approval') {
    return 'Наряд ещё на согласовании — закрыть можно после выдачи.'
  }
  if (permit.status === 'issued') {
    return 'Наряд выдан — нажмите «Закрыть НДПР», если работы завершены.'
  }
  if (permit.status === 'draft') {
    return 'Черновик нельзя закрыть — отправьте на согласование или удалите.'
  }
  if (['closed', 'archived', 'annulled'].includes(permit.status)) {
    return 'Наряд уже закрыт или аннулирован.'
  }
  if (actor.role === 'performer' && permit.performerUid && permit.performerUid !== actor.id) {
    return 'Вы не указаны как производитель работ в этом наряде.'
  }
  return 'Закрытие недоступно для текущего статуса наряда.'
}
