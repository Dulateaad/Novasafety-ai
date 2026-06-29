import type { Permit } from '../types/domain'

/** Наряды с активной остановкой — для очереди инженера по ОТ, ТБ и ООС. */
export function pendingWorkStopPermits(permits: Permit[]): Permit[] {
  return permits
    .filter((p) => p.workStop?.status === 'pending')
    .sort((a, b) => {
      const aIso = a.workStop?.atIso ?? ''
      const bIso = b.workStop?.atIso ?? ''
      return aIso < bIso ? 1 : -1
    })
}
