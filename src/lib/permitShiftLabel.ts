import type { Permit } from '../types/domain'

/** Дневной / ночной наряд для сводки на сайте и в PDF. */
export function permitShiftLabel(permit: Pick<Permit, 'f02' | 'asor'>): string {
  const shift = permit.f02?.shift
  if (shift === 'day') return 'Дневной'
  if (shift === 'night') return 'Ночной'

  const abr = permit.asor?.abr
  if (abr?.shiftNight && !abr?.shiftDay) return 'Ночной'
  if (abr?.shiftDay && !abr?.shiftNight) return 'Дневной'
  if (abr?.shiftNight && abr?.shiftDay) return 'Дневной / ночной'

  return '—'
}
