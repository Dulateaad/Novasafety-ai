import type { DocumentData } from 'firebase-admin/firestore'

const ERT_APPROVAL_ACTIVITIES = new Set(['open_flame_fire', 'gas_hazard'])

function hasErtWorkPermission(permit: DocumentData): boolean {
  const bundle = permit.workPermissions as
    | { documents?: { kind?: string }[] }
    | undefined
  const docs = Array.isArray(bundle?.documents) ? bundle!.documents! : []
  return docs.some((d) => {
    const kind = String(d?.kind ?? '')
    return kind === 'open_flame_fire' || kind === 'gas_hazard'
  })
}

/** Огневые и газоопасные работы — ERT (ПАС) в очереди согласования и газотест. */
export function permitRequiresErtApproval(permit: DocumentData): boolean {
  if (String(permit.permitType ?? '') === 'fire') return true
  const single = String(permit.specialWorkActivity ?? '')
  if (ERT_APPROVAL_ACTIVITIES.has(single)) return true
  const activities = Array.isArray(permit.specialWorkActivities)
    ? permit.specialWorkActivities
    : []
  if (activities.some((a) => ERT_APPROVAL_ACTIVITIES.has(String(a)))) return true
  return hasErtWorkPermission(permit)
}
