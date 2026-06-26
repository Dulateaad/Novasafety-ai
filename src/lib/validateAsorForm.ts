import type { AsorForm } from '../types/asor'
import { fillTemplate, localeMessages, type LanguageCode } from '../i18n/getLocale'
import { hazardRowHasContent } from './finalizeGeneratedRiskDocs'

/** АБР сформирован: есть этапы с опасностями или мерами защиты. */
export function isAbrReady(form: AsorForm): boolean {
  if (!form.abr?.stages.length) return false
  return form.abr.stages.some(
    (s) => s.title.trim() && (s.hazardNumbers.length > 0 || s.controlNumbers.length > 0),
  )
}

/** Оценка риска сформирована: есть задания с описанными опасностями. */
export function isRiskAssessmentReady(form: AsorForm): boolean {
  if (form.tasks.length === 0) return false
  return form.tasks.some((t) => t.hazards.some(hazardRowHasContent))
}

export function validateAsorForm(form: AsorForm, code?: LanguageCode): string | null {
  const m = localeMessages(code)
  const v = m.validation
  const abr = m.branding.abr
  const risk = m.docKit.risk
  if (!isAbrReady(form)) {
    return !form.abr?.stages.length
      ? fillTemplate(v.abrNotGenerated, { abr })
      : fillTemplate(v.abrEmptyStages, { abr })
  }
  if (!isRiskAssessmentReady(form)) {
    return form.tasks.length === 0
      ? fillTemplate(v.riskNotGenerated, { risk })
      : fillTemplate(v.riskEmpty, { risk })
  }
  return null
}
