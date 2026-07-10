import type { DocumentData } from 'firebase-admin/firestore'

const GAS_TEST_KINDS = new Set(['gas_hazard', 'open_flame_fire', 'confined_space'])

function gasFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false
  return String(value).trim().length > 0
}

function gasTestReadingFilled(row: Record<string, unknown>): boolean {
  return (
    Boolean(String(row.atIso ?? '').trim()) ||
    gasFieldFilled(row.location) ||
    gasFieldFilled(row.lelPercent) ||
    gasFieldFilled(row.h2sPpm) ||
    gasFieldFilled(row.o2Percent) ||
    gasFieldFilled(row.coPpm) ||
    gasFieldFilled(row.instrumentNo)
  )
}

function gasTestDocFilled(doc: Record<string, unknown>): boolean {
  const kind = String(doc.kind ?? '')
  if (!GAS_TEST_KINDS.has(kind)) return true
  const gasTests = Array.isArray(doc.gasTests) ? doc.gasTests : []
  return gasTests.some((row) =>
    gasTestReadingFilled(row as Record<string, unknown>),
  )
}

export function permitHasGasTestDocuments(permit: DocumentData): boolean {
  const bundle = permit.workPermissions as { documents?: Record<string, unknown>[] } | undefined
  const docs = Array.isArray(bundle?.documents) ? bundle!.documents! : []
  return docs.some((doc) => GAS_TEST_KINDS.has(String(doc.kind ?? '')))
}

export function ertGasTestBlocksErtSign(permit: DocumentData): boolean {
  if (!permitHasGasTestDocuments(permit)) return false
  const bundle = permit.workPermissions as { documents?: Record<string, unknown>[] } | undefined
  const docs = Array.isArray(bundle?.documents) ? bundle!.documents! : []
  return docs.some((doc) => {
    const kind = String(doc.kind ?? '')
    if (!GAS_TEST_KINDS.has(kind)) return false
    return !gasTestDocFilled(doc)
  })
}
