import type { DocumentData } from 'firebase-admin/firestore'

/** Подпись допускающего — после «Сохранить проверки» (галочки опциональны). */
export function permitterPreWorkAllowsSign(permit: DocumentData): boolean {
  const wp = permit.workPermissions as
    | {
        permitterPreWorkSavedAtIso?: string
        documents?: { kind?: string }[]
      }
    | undefined
  const docs = Array.isArray(wp?.documents) ? wp!.documents! : []
  const editable = docs.filter((d) => String(d?.kind ?? '') !== 'confined_space')
  if (editable.length === 0) return true
  return Boolean(String(wp?.permitterPreWorkSavedAtIso ?? '').trim())
}
