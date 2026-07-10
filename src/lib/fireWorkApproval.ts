import {
  activitiesRequireErtApproval,
  type Permit,
  type PermitDraft,
} from '../types/domain'

function hasErtWorkPermission(
  permit: Pick<Permit | PermitDraft, 'workPermissions'>,
): boolean {
  const docs = permit.workPermissions?.documents ?? []
  return docs.some(
    (d) => d.kind === 'open_flame_fire' || d.kind === 'gas_hazard',
  )
}

/** Огневые и газоопасные работы — ERT (ПАС) в очереди согласования и газотест. */
export function permitRequiresErtApproval(
  permit: Pick<
    Permit | PermitDraft,
    | 'specialWorkActivities'
    | 'specialWorkActivity'
    | 'permitType'
    | 'workPermissions'
  >,
): boolean {
  if (permit.permitType === 'fire') return true
  if (
    activitiesRequireErtApproval(
      permit.specialWorkActivities,
      permit.specialWorkActivity,
    )
  ) {
    return true
  }
  return hasErtWorkPermission(permit)
}
