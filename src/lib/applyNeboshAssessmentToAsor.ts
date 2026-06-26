import {
  neboshBandToResidual,
  neboshRiskBand,
  neboshRiskScore,
  type NeboshScaleValue,
} from '../config/neboshRiskMatrix'
import type { AsorForm, AsorTaskBlock } from '../types/asor'
import {
  defaultNeboshMeta,
  emptyHazard,
  emptyTask,
} from '../types/asor'
import type { NeboshRiskAssessmentPayload } from './neboshRiskAssessmentParse'

export function applyNeboshAssessmentToAsor(
  form: AsorForm,
  payload: NeboshRiskAssessmentPayload,
): AsorForm {
  const groups = payload.operationGroups ?? []
  const tasks: AsorTaskBlock[] = []

  let taskOrdinal = 0
  for (const group of groups) {
    const title = group.groupTitle || `Группа ${taskOrdinal + 1}`
    const hazards = (group.hazards ?? []).map((h, i) => {
      const residualBand = neboshRiskBand(
        neboshRiskScore(
          (h.residualLikelihood ?? 0) as NeboshScaleValue,
          (h.residualSeverity ?? 0) as NeboshScaleValue,
        ),
      )
      let measures = h.protectiveMeasures || ''
      if (h.residualNote?.trim()) {
        measures = measures ? `${measures}\n${h.residualNote}` : h.residualNote
      }
      return {
        ...emptyHazard(),
        ordinal: i + 1,
        operationText: h.operationText || title,
        factorDescription: h.factorDescription ?? '',
        whoAtRisk: h.whoAtRisk || 'Операторы, персонал площадки',
        initialLikelihood: (h.initialLikelihood ?? 0) as NeboshScaleValue,
        initialSeverity: (h.initialSeverity ?? 0) as NeboshScaleValue,
        protectiveMeasures: measures,
        residualLikelihood: (h.residualLikelihood ?? 0) as NeboshScaleValue,
        residualSeverity: (h.residualSeverity ?? 0) as NeboshScaleValue,
        residualRisk: neboshBandToResidual(residualBand),
        responsiblePerson: h.responsiblePerson || title,
      }
    })
    if (hazards.length === 0) continue
    taskOrdinal += 1
    tasks.push({
      ...emptyTask(taskOrdinal),
      taskTitle: title,
      hazards,
    })
  }

  const nb = payload.nebosh ?? {}
  return {
    ...form,
    shortTitleForNarjad: payload.workTitle || form.shortTitleForNarjad,
    tasks: tasks.length > 0 ? tasks : form.tasks,
    nebosh: {
      ...defaultNeboshMeta(),
      ...form.nebosh,
      ...nb,
      ppeTable: nb.ppeTable?.length ? nb.ppeTable : form.nebosh.ppeTable,
      emergencyPlan: nb.emergencyPlan?.length
        ? nb.emergencyPlan
        : form.nebosh.emergencyPlan,
      permitsTable: nb.permitsTable?.length
        ? nb.permitsTable
        : form.nebosh.permitsTable,
      signatureRows: nb.signatureRows?.length
        ? nb.signatureRows
        : form.nebosh.signatureRows,
    },
  }
}
