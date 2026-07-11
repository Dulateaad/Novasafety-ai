import type { Permit } from '../types/domain'

/** Конец срока действия НДПР (дата/время). */
export function permitValidityEndIso(permit: Permit): string | null {
  const raw =
    permit.validUntilIso?.trim() ||
    permit.f04?.validUntilIso?.trim() ||
    permit.f02.endDate?.trim() ||
    ''
  if (!raw) return null
  return raw.length <= 10 ? `${raw.slice(0, 10)}T23:59:59` : raw
}

export function permitValidityEndDate(permit: Permit): Date | null {
  const iso = permitValidityEndIso(permit)
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

const MS_48H = 48 * 60 * 60 * 1000

/** Кнопка «Продление НДПР» — за 48 ч до окончания срока. */
export function isNdprExtensionWindowOpen(permit: Permit, now = Date.now()): boolean {
  const end = permitValidityEndDate(permit)
  if (!end) return false
  const diff = end.getTime() - now
  return diff > 0 && diff <= MS_48H
}

export function addCalendarDays(isoDate: string, days: number): string {
  const base = isoDate.trim().slice(0, 10)
  const d = new Date(`${base}T12:00:00`)
  if (Number.isNaN(d.getTime())) return base
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
