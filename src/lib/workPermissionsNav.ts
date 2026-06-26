import { restoreNewPermitDraftFromSession } from './newPermitDraftAutosave'
import { isRiskGatePassed } from './riskGate'
import { requiresWorkPermissions } from './workPermissions'

/** Вкладка «Разрешения» — только если в НДПР выбраны виды работ, требующие спецразрешений. */
export function isPermissionsTabRelevant(): boolean {
  try {
    const draft = restoreNewPermitDraftFromSession()
    return requiresWorkPermissions(draft)
  } catch {
    return false
  }
}

export function isPermissionsNavAccessible(): boolean {
  if (!isPermissionsTabRelevant()) return false
  return isRiskGatePassed()
}
