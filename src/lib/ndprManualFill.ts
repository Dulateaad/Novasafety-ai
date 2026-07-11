import { isNdprManualFillMode } from './packageSession'
import { loadPprForm, pprHasNdprSource } from './pprAutosave'
import type { PprForm } from '../types/ppr'

/** Подстановка полей НДПР из ППР — только при загрузке/извлечении ППР, не при ручном бланке. */
export function shouldAutofillNdprFromPpr(ppr?: PprForm): boolean {
  if (isNdprManualFillMode()) return false
  return pprHasNdprSource(ppr ?? loadPprForm())
}
