import type { Permit, PermitDraft } from '../types/domain'
import { clearResumePermitId, readResumePermitId } from './resumePermitPackage'

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

/** Номер из возобновлённого наряда, из черновика (если наряд ещё есть) или следующий свободный. */
export function resolveRegistrationRefNo(
  draft: PermitDraft,
  permits: Permit[],
  resumePermitId?: string | null,
): string {
  const resumeId = resumePermitId?.trim() || null
  const resumed = resumeId ? permits.find((p) => p.id === resumeId) : undefined
  if (resumeId && !resumed) {
    clearResumePermitId()
  }
  const resumedRef = resumed?.registrationRefNo?.trim()
  if (resumedRef) return resumedRef

  const draftRef = draft.registrationRefNo?.trim()
  if (draftRef) {
    // Сохраняем № при пересогласовании: если наряд с этим номером ещё в журнале.
    const stillExists = permits.some((p) => p.registrationRefNo?.trim() === draftRef)
    if (stillExists) return draftRef
  }

  // Не подставляем «мёртвый» номер из session после удаления нарядов.
  return nextRegistrationNumber(permits)
}

/** Актуальный рег. № для черновика: из черновика, возобновлённого наряда или следующий свободный. */
export function resolveDraftRegistrationRefNo(
  draft: PermitDraft,
  permits: readonly Permit[],
  resumePermitId?: string | null,
): string {
  const trimmed = draft.registrationRefNo.trim()
  if (trimmed) return trimmed
  const resumeId = resumePermitId?.trim() || readResumePermitId()
  const fromPermit = resumeId
    ? permits.find((p) => p.id === resumeId)?.registrationRefNo?.trim()
    : ''
  if (fromPermit) return fromPermit
  return resolveRegistrationRefNo(draft, [...permits], resumeId)
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
