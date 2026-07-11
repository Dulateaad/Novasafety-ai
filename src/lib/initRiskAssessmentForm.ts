import { addAbrStage } from './abrStageListEdit'
import { addNeboshTask } from './neboshTaskListEdit'
import type { PermitDraft } from '../types/domain'
import type { PprForm } from '../types/ppr'
import type { AsorForm } from '../types/asor'
import { ASOR_EDITOR_AUTOSAVE_KEY, emptyAsorForm, normalizeAsorIncoming } from '../types/asor'
import { emptyAbrForm } from '../types/abr'

/** Восстанавливает черновик из sessionStorage. */
export function loadRiskAssessmentForm(): AsorForm | null {
  try {
    const raw = sessionStorage.getItem(ASOR_EDITOR_AUTOSAVE_KEY)
    if (!raw) return null
    const parsed = normalizeAsorIncoming(JSON.parse(raw))
    return parsed ?? null
  } catch {
    return null
  }
}

/** Минимальная пустая структура: один этап АБР и одно задание оценки риска. */
export function ensureManualRiskScaffold(
  form: AsorForm,
  _nd: PermitDraft,
  _ppr: PprForm,
  _resolveName: (uid: string) => string,
  _resolveBadge: (uid: string) => string,
): AsorForm {
  let next = form
  if (!next.abr?.stages.length) {
    next = { ...next, abr: addAbrStage(next.abr ?? emptyAbrForm()) }
  }
  if (!next.tasks.length) {
    next = addNeboshTask(next)
  }
  return next
}

/** Пустая форма для ручного заполнения — без автоподстановки из ППР и НДПР. */
export function buildManualRiskAssessmentForm(
  _nd: PermitDraft,
  _ppr: PprForm,
  _resolveName: (uid: string) => string,
  _resolveBadge: (uid: string) => string,
): AsorForm {
  return ensureManualRiskScaffold(
    emptyAsorForm(),
    _nd,
    _ppr,
    _resolveName,
    _resolveBadge,
  )
}
