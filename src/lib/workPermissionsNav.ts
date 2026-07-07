import { isPprAnalysisComplete, loadPprForm, pprHasNdprSource } from './pprAutosave'
import { isPprGatePassed } from './pprGate'
import { isRiskGatePassed } from './riskGate'
import { pprRequiresSpecialPermissions } from './workPermissions'

/** Вкладка «Разрешения» — только после анализа ППР и если нужны ГО/ОР/ЗП. */
export function isPermissionsTabRelevant(): boolean {
  try {
    if (!isPprGatePassed()) return false
    const ppr = loadPprForm()
    if (!pprHasNdprSource(ppr)) return false
    if (!isPprAnalysisComplete(ppr)) return false
    return pprRequiresSpecialPermissions(ppr)
  } catch {
    return false
  }
}

export function isPermissionsNavAccessible(): boolean {
  if (!isPermissionsTabRelevant()) return false
  return isRiskGatePassed()
}
