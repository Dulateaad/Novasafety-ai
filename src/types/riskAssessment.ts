/** Оценка рисков перед оформлением НД (оцифрованный процесс под корпоративный шаблон). */

export type RiskResidualLevel = '' | 'low' | 'medium' | 'high' | 'critical'

export const RISK_RESIDUAL_LABELS: Record<
  Exclude<RiskResidualLevel, ''>,
  string
> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический / неприемлемый',
}

export interface RiskAssessmentStepRow {
  id: string
  /** Этап / последовательность работ */
  phase: string
  /** Выявленные опасности и источники риска */
  hazards: string
  /** Возможные последствия / сценарий */
  consequence: string
  /** Имеющиеся меры (инженерные, организационные, СИЗ) */
  existingControls: string
  /** Дополнительные меры до начала работ */
  additionalControls: string
  residualRisk: RiskResidualLevel
  /** Ответственный за меры до работ */
  accountable: string
}

export interface RiskAssessmentDraft {
  /** № документа карты оценки (если ведётся) */
  assessmentRefNo: string
  organization: string
  subdivision: string
  assessmentDate: string
  plannedWorkTitle: string
  workLocationDetail: string
  /** Если совпадает со списком объектов НД — подставится в наряд */
  ptwSiteMatch: string
  personnelPresentNote: string
  steps: RiskAssessmentStepRow[]
  /** Приемлем ли остаточный риск для допуска к работам */
  overallAcceptable: boolean | ''
  responsibleSupervisorNote: string
  extraNotes: string
}

export const RISK_ASSESSMENT_STORAGE_KEY = 'nova_safety_risk_assessment_v1'

export function emptyRiskStepRow(): RiskAssessmentStepRow {
  return {
    id: crypto.randomUUID(),
    phase: '',
    hazards: '',
    consequence: '',
    existingControls: '',
    additionalControls: '',
    residualRisk: '',
    accountable: '',
  }
}

export function emptyRiskAssessmentDraft(): RiskAssessmentDraft {
  const today = new Date().toISOString().slice(0, 10)
  return {
    assessmentRefNo: '',
    organization: '',
    subdivision: '',
    assessmentDate: today,
    plannedWorkTitle: '',
    workLocationDetail: '',
    ptwSiteMatch: '',
    personnelPresentNote: '',
    steps: [emptyRiskStepRow()],
    overallAcceptable: '',
    responsibleSupervisorNote: '',
    extraNotes: '',
  }
}
