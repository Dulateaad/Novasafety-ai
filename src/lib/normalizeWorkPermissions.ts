import type {
  WorkPermissionCheckboxGroup,
  WorkPermissionDocument,
  WorkPermissionForm,
  WorkPermissionKind,
  WorkPermissionsBundle,
} from '../types/workPermissions'
import { emptyWorkPermissionForm } from '../types/workPermissions'

function mergeCheckboxGroup(
  base: WorkPermissionCheckboxGroup,
  incoming?: WorkPermissionCheckboxGroup,
): WorkPermissionCheckboxGroup {
  if (!incoming?.items?.length) return base
  const byId = new Map(incoming.items.map((i) => [i.id, i]))
  return {
    label: incoming.label || base.label,
    items: base.items.map((item) => {
      const hit = byId.get(item.id)
      return hit
        ? {
            ...item,
            checked: hit.checked,
            required: hit.required ?? item.required ?? false,
            note: hit.note ?? '',
          }
        : item
    }),
  }
}

export function normalizeWorkPermissionForm(
  kind: WorkPermissionKind,
  raw?: Partial<WorkPermissionForm>,
): WorkPermissionForm {
  const base = emptyWorkPermissionForm(kind)
  if (!raw) return base
  return {
    ...base,
    ...raw,
    preWorkChecks: mergeCheckboxGroup(base.preWorkChecks, raw.preWorkChecks),
    closureChecks: mergeCheckboxGroup(base.closureChecks!, raw.closureChecks),
    confinedSpaceTypes: base.confinedSpaceTypes
      ? mergeCheckboxGroup(base.confinedSpaceTypes, raw.confinedSpaceTypes)
      : raw.confinedSpaceTypes,
    connectionMethods: base.connectionMethods
      ? mergeCheckboxGroup(base.connectionMethods, raw.connectionMethods)
      : raw.connectionMethods,
    rescueEquipment: base.rescueEquipment
      ? mergeCheckboxGroup(base.rescueEquipment, raw.rescueEquipment)
      : raw.rescueEquipment,
    emergencyContacts:
      raw.emergencyContacts?.length ? raw.emergencyContacts : base.emergencyContacts,
  }
}

export function normalizeWorkPermissionDocument(raw: unknown): WorkPermissionDocument | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<WorkPermissionDocument>
  if (o.kind !== 'confined_space' && o.kind !== 'open_flame_fire' && o.kind !== 'gas_hazard') {
    return null
  }
  return {
    kind: o.kind,
    title: typeof o.title === 'string' ? o.title : '',
    form: normalizeWorkPermissionForm(o.kind, o.form),
    gasTests: Array.isArray(o.gasTests) ? o.gasTests : [],
    signatures: Array.isArray(o.signatures) ? o.signatures : [],
    egovSignatures: o.egovSignatures,
    generatedAtIso: o.generatedAtIso,
    documentHash: o.documentHash,
    pdfBase64: o.pdfBase64,
  }
}

export function normalizeWorkPermissionsBundle(raw: unknown): WorkPermissionsBundle | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Partial<WorkPermissionsBundle>
  if (!Array.isArray(o.documents) || o.documents.length === 0) return undefined
  const documents = o.documents
    .map((d) => normalizeWorkPermissionDocument(d))
    .filter(Boolean) as WorkPermissionDocument[]
  if (!documents.length) return undefined
  const savedAt =
    typeof o.permitterPreWorkSavedAtIso === 'string'
      ? o.permitterPreWorkSavedAtIso.trim()
      : ''
  return {
    documents,
    updatedAtIso: typeof o.updatedAtIso === 'string' ? o.updatedAtIso : new Date().toISOString(),
    ...(savedAt ? { permitterPreWorkSavedAtIso: savedAt } : {}),
  }
}
