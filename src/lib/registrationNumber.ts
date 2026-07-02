import type { Permit, PermitDraft } from '../types/domain'

/** Учитывает только строки «001», «12» и т.д. (одни цифры). Прочее — 0 для выбора следующего номера. */
export function parseRegistrationSequence(ref: string | undefined): number {
  if (!ref) return 0
  const t = ref.trim()
  if (!/^\d+$/.test(t)) return 0
  const n = parseInt(t, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function formatRegistrationNumber(n: number): string {
  const next = Math.max(1, Math.floor(n))
  const width = next <= 999 ? 3 : String(next).length
  return String(next).padStart(width, '0')
}

function maxRegistrationSequence(permits: Permit[]): number {
  let max = 0
  for (const p of permits) {
    const n = parseRegistrationSequence(p.registrationRefNo)
    if (n > max) max = n
  }
  return max
}

function maxSequenceInPermits(
  permits: Permit[],
  opts?: { performerUid?: string },
): number {
  let max = 0
  for (const p of permits) {
    if (opts?.performerUid && p.performerUid !== opts.performerUid) continue
    const n = Math.max(
      parseRegistrationSequence(p.registrationRefNo),
      parseRegistrationSequence(p.f02?.badgeNo),
    )
    if (n > max) max = n
  }
  return max
}

/** Следующий номер бейджа для производителя работ (001, 002, … по его нарядам). */
export function nextBadgeNumberForPerformer(
  permits: Permit[],
  performerUid: string,
): string {
  return formatRegistrationNumber(maxSequenceInPermits(permits, { performerUid }) + 1)
}

/** Следующий регистрационный номер при создании НД: `001`, `002`, … (минимум 3 символа). */
export function nextRegistrationNumber(permits: Permit[]): string {
  return formatRegistrationNumber(maxRegistrationSequence(permits) + 1)
}

/** Номер из черновика, возобновлённого наряда или следующий свободный рег. номер (не № бейджа). */
export function resolveRegistrationRefNo(
  draft: PermitDraft,
  permits: Permit[],
  resumePermitId?: string | null,
): string {
  const resumed = resumePermitId
    ? permits.find((p) => p.id === resumePermitId)
    : undefined
  const resumedRef = resumed?.registrationRefNo?.trim()
  if (resumedRef) return resumedRef

  const manual = draft.registrationRefNo?.trim()
  if (manual && /^\d+$/.test(manual)) {
    const formatted = formatRegistrationNumber(parseInt(manual, 10))
    if (!permits.some((p) => p.registrationRefNo === formatted)) {
      return formatted
    }
  }
  return nextRegistrationNumber(permits)
}

/** Перенумеровать список нарядов 001… по дате создания (локальный журнал). */
export function renumberPermitsInList(permits: Permit[]): Permit[] {
  const sorted = [...permits].sort((a, b) => {
    const ca = a.createdAtIso || a.updatedAtIso || ''
    const cb = b.createdAtIso || b.updatedAtIso || ''
    return ca.localeCompare(cb) || a.id.localeCompare(b.id)
  })
  return sorted.map((p, i) => ({
    ...p,
    registrationRefNo: formatRegistrationNumber(i + 1),
    updatedAtIso: new Date().toISOString(),
  }))
}
