import type { DemoUser, Permit } from '../types/domain'
import { matrixRow } from './matrix'
import { addCalendarDays, isNdprExtensionWindowOpen, permitValidityEndIso } from './permitValidity'
import { isPermitProducer } from './closeNdprEarly'

const ACTIVE = new Set<Permit['status']>(['issued', 'in_progress', 'suspended'])

export function canExtendNdpr(permit: Permit, actor: DemoUser): boolean {
  if (!ACTIVE.has(permit.status)) return false
  if (actor.role === 'coordinator') return isNdprExtensionWindowOpen(permit)
  if (isPermitProducer(permit, actor)) return isNdprExtensionWindowOpen(permit)
  return false
}

export function ndprExtensionDeniedReason(permit: Permit, actor: DemoUser): string | null {
  if (canExtendNdpr(permit, actor)) return null
  if (actor.role !== 'performer' && actor.role !== 'coordinator') {
    return 'Продление доступно производителю работ или координатору.'
  }
  if (!ACTIVE.has(permit.status)) {
    return 'Продление доступно для выданного или выполняемого НДПР.'
  }
  if (!permitValidityEndIso(permit)) {
    return 'Не задан срок действия НДПР — укажите дату окончания в карточке.'
  }
  if (!isNdprExtensionWindowOpen(permit)) {
    return 'Кнопка продления активна за 48 часов до окончания срока действия НДПР.'
  }
  return 'Продление недоступно.'
}

/** Продлить на 1 сутки (политика матрицы — daily). */
export function buildNdprExtensionPatch(permit: Permit): Partial<Permit> {
  const current =
    permit.validUntilIso?.slice(0, 10) ||
    permit.f04?.validUntilIso?.slice(0, 10) ||
    permit.f02.endDate?.slice(0, 10) ||
    ''
  const row = matrixRow(permit.category)
  const days = row.extensionPolicy === 'daily' ? 1 : 1
  const nextDate = addCalendarDays(current || new Date().toISOString().slice(0, 10), days)
  const nextIso = `${nextDate}T23:59:59`
  return {
    validUntilIso: nextIso,
    f02: { ...permit.f02, endDate: nextDate },
    f04: permit.f04 ? { ...permit.f04, validUntilIso: nextDate } : permit.f04,
  }
}
