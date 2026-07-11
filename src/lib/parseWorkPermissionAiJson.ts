import type { WorkPermissionCheckboxGroup, WorkPermissionForm } from '../types/workPermissions'

type AiCheckboxPayload = {
  items?: { id: string; checked?: boolean; required?: boolean; note?: string }[]
}

export type WorkPermissionAiPayload = {
  preWorkChecks?: AiCheckboxPayload
  confinedSpaceTypes?: AiCheckboxPayload | null
  connectionMethods?: AiCheckboxPayload | null
  rescueEquipment?: AiCheckboxPayload | null
  emergencyContacts?: {
    role?: string
    internalPhone?: string
    externalPhone?: string
    radioChannel?: string
  }[]
  bodyText?: string
  additionalNotes?: string
}

function applyCheckboxPayload(
  group: WorkPermissionCheckboxGroup,
  payload?: AiCheckboxPayload | null,
): WorkPermissionCheckboxGroup {
  if (!payload?.items?.length) return group
  const byId = new Map(payload.items.map((i) => [i.id, i]))
  return {
    ...group,
    items: group.items.map((item) => {
      const hit = byId.get(item.id)
      if (!hit) return item
      return {
        ...item,
        checked: Boolean(hit.checked),
        required: typeof hit.required === 'boolean' ? hit.required : item.required,
        note: typeof hit.note === 'string' ? hit.note : item.note,
      }
    }),
  }
}

export function parseWorkPermissionAiJson(raw: string): WorkPermissionAiPayload {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1)
  return JSON.parse(jsonText) as WorkPermissionAiPayload
}

export function mergeAiIntoPermissionForm(
  form: WorkPermissionForm,
  payload: WorkPermissionAiPayload,
): WorkPermissionForm {
  return {
    ...form,
    preWorkChecks: applyCheckboxPayload(form.preWorkChecks, payload.preWorkChecks),
    confinedSpaceTypes: form.confinedSpaceTypes
      ? applyCheckboxPayload(form.confinedSpaceTypes, payload.confinedSpaceTypes)
      : form.confinedSpaceTypes,
    connectionMethods: form.connectionMethods
      ? applyCheckboxPayload(form.connectionMethods, payload.connectionMethods)
      : form.connectionMethods,
    rescueEquipment: form.rescueEquipment
      ? applyCheckboxPayload(form.rescueEquipment, payload.rescueEquipment)
      : form.rescueEquipment,
    emergencyContacts: payload.emergencyContacts?.length
      ? payload.emergencyContacts.map((c, idx) => ({
          id: form.emergencyContacts[idx]?.id ?? crypto.randomUUID(),
          role: c.role ?? form.emergencyContacts[idx]?.role ?? '',
          internalPhone: c.internalPhone ?? '',
          externalPhone: c.externalPhone ?? '',
          radioChannel: c.radioChannel ?? '',
        }))
      : form.emergencyContacts,
    bodyText: payload.bodyText?.trim() || form.bodyText,
    additionalNotes: payload.additionalNotes?.trim() || form.additionalNotes,
  }
}
