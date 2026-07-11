import type { StoredEgovSignature } from './egovSignature'

/** Запись о замене производителя работ по действующему наряду. */
export interface PerformerReplacement {
  fromUid: string
  fromDisplayName: string
  toUid: string
  toDisplayName: string
  atIso: string
  replacedByUid: string
  /** ЭЦП снятого производителя (сохраняется до перезаписи новой подписью). */
  previousEgovSignature?: StoredEgovSignature
}

export function normalizePerformerReplacements(raw: unknown): PerformerReplacement[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const fromUid = String(o.fromUid ?? '').trim()
      const toUid = String(o.toUid ?? '').trim()
      const atIso = String(o.atIso ?? '').trim()
      if (!fromUid || !toUid || !atIso) return null
      const prev = o.previousEgovSignature
      return {
        fromUid,
        fromDisplayName: String(o.fromDisplayName ?? '').trim(),
        toUid,
        toDisplayName: String(o.toDisplayName ?? '').trim(),
        atIso,
        replacedByUid: String(o.replacedByUid ?? '').trim(),
        ...(prev && typeof prev === 'object'
          ? { previousEgovSignature: prev as StoredEgovSignature }
          : {}),
      } satisfies PerformerReplacement
    })
    .filter(Boolean) as PerformerReplacement[]
}
