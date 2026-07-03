import type { RiskAssessmentDraft } from '../types/riskAssessment'
import { RISK_ASSESSMENT_LABEL } from '../config/branding'
import {
  RISK_RESIDUAL_LABELS,
  type RiskResidualLevel,
} from '../types/riskAssessment'
import { PTW_SITES_SET } from '../config/ptwSites'

/** Текстовый блок «описание работ» с выдержкой из оценки для поля НД. */
export function riskAssessmentWorkDescription(draft: RiskAssessmentDraft): string {
  const lines: string[] = []
  lines.push(
    `[${RISK_ASSESSMENT_LABEL}${draft.assessmentRefNo.trim() ? ` № ${draft.assessmentRefNo.trim()}` : ''} от ${draft.assessmentDate || '—'}]`,
  )
  if (draft.personnelPresentNote.trim()) {
    lines.push(`Участники оценки: ${draft.personnelPresentNote.trim()}`)
  }
  if (draft.workLocationDetail.trim()) {
    lines.push(`Место / участок (детализация): ${draft.workLocationDetail.trim()}`)
  }
  draft.steps
    .filter(
      (s) =>
        s.phase.trim() ||
        s.hazards.trim() ||
        s.existingControls.trim() ||
        s.additionalControls.trim(),
    )
    .forEach((s, idx) => {
      const lvl =
        s.residualRisk !== ''
          ? RISK_RESIDUAL_LABELS[s.residualRisk as Exclude<RiskResidualLevel, ''>]
          : '—'
      lines.push('')
      lines.push(
        `${idx + 1}. Этап: ${s.phase.trim() || '—'}\nОпасности: ${s.hazards.trim() || '—'}\nПоследствия: ${s.consequence.trim() || '—'}\nИмеющиеся меры: ${s.existingControls.trim() || '—'}\nДополнительные меры: ${s.additionalControls.trim() || '—'}\nОстаточный риск: ${lvl}\nОтветственный: ${s.accountable.trim() || '—'}`,
      )
    })
  if (draft.responsibleSupervisorNote.trim()) {
    lines.push('')
    lines.push(`Ответственный руководитель / комментарий: ${draft.responsibleSupervisorNote.trim()}`)
  }
  if (draft.extraNotes.trim()) {
    lines.push('')
    lines.push(draft.extraNotes.trim())
  }
  return lines.join('\n').trimEnd()
}

export function coerceRiskAssessmentSite(siteRaw: string, fallbackSite: string) {
  const s = siteRaw.trim()
  if (s && PTW_SITES_SET.has(s)) return s
  return fallbackSite
}
