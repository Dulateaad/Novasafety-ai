/** АСОР — УОГ, UOG-HSE-PR-001-F01 (оцифрованная модель анкеты). */

import {
  ISSUER_DOCUMENT_ROLE_LABEL,
  LEAD_EXPERT_DOCUMENT_ROLE_LABEL,
  PERFORMER_DOCUMENT_ROLE_LABEL,
  PERMITTER_DOCUMENT_ROLE_LABEL,
} from '../config/branding'
import type { AbrForm } from './abr'
import { normalizeAbrForm } from './abr'

export const ASOR_EDITION_META = {
  edition: 'A2',
  formRef: 'UOG-HSE-PR-001-F01',
  title: 'Мероприятия по ОТ, ТБ и ООС',
  subtitle: '',
} as const

/** Ссылки как на бланке (стр. 2) для ознакомления персонала. */
export const ASOR_PROCEDURE_REFS_DISPLAY = [
  'UOG-HSE-PR-012 Процедура работы на высоте',
  'UOG-HSE-PR-001 Процедура по идентификации и оценке рисков',
  'UOG-HSE-PR-007-R Система наряд-допуска',
  'UOG-HSE-PR-055 Процедура знаки безопасности и сигнальная разметка',
  'UOG-HSE-PL-003 «План управления отходами»',
] as const

export type AsorTaskResidualRisk = '' | 'low' | 'medium' | 'high'

export const ASOR_TASK_RESIDUAL_LABELS: Record<
  Exclude<AsorTaskResidualRisk, ''>,
  string
> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

import {
  neboshBandToResidual,
  neboshRiskBand,
  neboshRiskScore,
  parseNeboshScale,
  type NeboshScaleValue,
} from '../config/neboshRiskMatrix'

export interface AsorNeboshPpeRow {
  item: string
  standard: string
  usage: string
}

export interface AsorNeboshEmergencyRow {
  scenario: string
  actions: string
  responsible: string
}

export interface AsorNeboshPermitRow {
  document: string
  application: string
  status: string
}

export interface AsorNeboshSignatureRow {
  role: string
  fullName: string
  dateIso: string
}

export interface AsorNeboshMeta {
  standardRef: string
  documentRef: string
  siteObject: string
  clientOrg: string
  contractorOrg: string
  preparedBy: string
  approvedBy: string
  nextReviewNote: string
  assessmentDateIso: string
  /** Раздел 3 — таблица СИЗ. */
  ppeTable: AsorNeboshPpeRow[]
  /** Раздел 4 — план аварийного реагирования. */
  emergencyPlan: AsorNeboshEmergencyRow[]
  /** Раздел 5 — ключевые разрешения и документы. */
  permitsTable: AsorNeboshPermitRow[]
  /** Раздел 6 — подписи. */
  signatureRows: AsorNeboshSignatureRow[]
  disclaimerNote: string
}

export interface AsorHazardRow {
  id: string
  ordinal: number
  /** Вид работ / операция (NEBOSH). */
  operationText: string
  factorDescription: string
  /** Кто под угрозой. */
  whoAtRisk: string
  initialLikelihood: NeboshScaleValue
  initialSeverity: NeboshScaleValue
  protectiveMeasures: string
  residualLikelihood: NeboshScaleValue
  residualSeverity: NeboshScaleValue
  residualRisk: AsorTaskResidualRisk
  responsiblePerson: string
}

export interface AsorTaskBlock {
  id: string
  ordinal: number
  taskTitle: string
  hazards: AsorHazardRow[]
}

/** Спец. СИЗ и доп. меры (раздел 1, множественные галочки). */
export interface AsorPpeSelections {
  faceShield: boolean
  arboristHelmet: boolean
  helmetPainting: boolean
  helmetWelding: boolean
  helmetOtherNote: string
  eyeChem: boolean
  eyeCuttingGrinding: boolean
  hearEarplugs: boolean
  hearMuffs: boolean
  hearTimeLimitNote: string
  respDustMask: boolean
  respCascade: boolean
  respSCBA: boolean
  respiratorTypeNote: boolean
  respiratorTypeText: string
  fallHarnessSystem: boolean
  clothingDisposable: boolean
  clothRainSuits: boolean
  clothChem: boolean
  clothWelding: boolean
  apronLeather: boolean
  apronChem: boolean
  glovesCotton: boolean
  glovesLeather: boolean
  glovesChem: boolean
  glovesWelding: boolean
  glovesDielectric: boolean
  glovesOtherNote: string
  feetDielectricBoots: boolean
  feetRubberBoots: boolean
  signsHearing: boolean
  signsDroppedObjects: boolean
  signsRadiography: boolean
  signsN2Blowdown: boolean
  signsOtherNote: string
  fenceDangerArea: boolean
  fenceGasWorks: boolean
  fenceOtherNote: string
  extraRadioOther: boolean
  extraRadioChannelNote: string
  extraRequirementsOtherNote: string
}

export interface AsorPermitDocuments {
  /** Наряд-допуск (отметить требуемый). */
  narjadPermit: boolean
  electricalInstallationPermit: boolean
  fireWorks: boolean
  pidDiagram: boolean
  gasHazardWorks: boolean
  hazardousEnergyIsolation: boolean
  radiographyWorks: boolean
  liftingOperationsPlan: boolean
  excavationPlan: boolean
  confinedSpacePermit: boolean
  simultaneousOpsSIMOPSPlan: boolean
  otherDocsLine: string
}

export interface AsorEmergencySelections {
  confinedSpaceARSPlan: boolean
  heightRescueInfoPack: boolean
  otherEmergencyNote: string
}

export interface AsorPersonRow {
  id: string
  rolePrinted: string
  fullNamePrinted: string
  badgeNo: string
  dateIso: string
  signatureAcknowledged: boolean
}

export type AsorApprovalSlotKey =
  | 'filled_work_permitter'
  | 'reviewed_permit_issuer'
  | 'acknowledged_work_supervisor'
  | 'approved_hse_uog'

export interface AsorApprovalRow {
  roleKey: AsorApprovalSlotKey
  roleLabelRu: string
  fullNamePrinted: string
  badgeNo: string
  dateIso: string
  acknowledged: boolean
}

/** Матрица стр. 5 (вероятность × степень тяжести). */
export type AsorMatrixLikelihood = '' | 'likely' | 'rare'

export type AsorMatrixSeverity =
  | ''
  | 'insignificant'
  | 'moderateHarm'
  | 'significantHarm'

/** Риск по комбинации — как ячейки цветной матрицы формы. */
export type MatrixCellRisk = '' | 'low' | 'medium' | 'high'

export interface AsorForm {
  creationDateIso: string
  /** Продолжительность работ (как «7 дней»). */
  workDurationText: string
  /** Предполагаемый или присвоенный № НД до реестра. */
  tentativeNdReference: string
  workScopeMarkdown: string
  equipmentMarkdown: string
  workPlacesText: string
  /** Краткое наименование для поля НД. */
  shortTitleForNarjad: string
  ppe: AsorPpeSelections
  toolsEquipmentList: string
  /** Персонал ознакомлен с перечнем процедур. */
  staffReadProcedureListConfirmed: boolean
  permitDocuments: AsorPermitDocuments
  emergency: AsorEmergencySelections
  supplementaryResourcesMarkdown: string
  tasks: AsorTaskBlock[]
  matrixLikelihood: AsorMatrixLikelihood
  matrixSeverity: AsorMatrixSeverity
  /** Рабочая команда АСОР (узнавание текстом). */
  teamParticipatingNote: string
  approvals: AsorApprovalRow[]
  declarationParagraphAccepted: boolean
  declarationTeamRows: AsorPersonRow[]
  shiftTakeoverMembers: AsorPersonRow[]
  /** Выбранные шаблоны мероприятий ОТ / ТБ / ООС. */
  selectedHseTemplateIds: string[]
  /** Метаданные оценки риска NEBOSH (титул документа). */
  nebosh: AsorNeboshMeta
  /** Анализ безопасности работ (бланк АБР). */
  abr?: AbrForm
}

export const ASOR_PENDING_FOR_PERMIT_KEY = 'nova_asor_bundle_for_nd_v1'
export const ASOR_EDITOR_AUTOSAVE_KEY = 'nova_asor_editor_autosave_v1'

export function emptyPersonRow(): AsorPersonRow {
  return {
    id: crypto.randomUUID(),
    rolePrinted: '',
    fullNamePrinted: '',
    badgeNo: '',
    dateIso: '',
    signatureAcknowledged: false,
  }
}

export function defaultNeboshMeta(): AsorNeboshMeta {
  return {
    standardRef: 'ISO 45001:2018 / Законодательство РК',
    documentRef: '',
    siteObject: '',
    clientOrg: 'ТОО «Урал Ойл энд Газ»',
    contractorOrg: '',
    preparedBy: '',
    approvedBy: '',
    nextReviewNote: 'До начала каждого этапа работ или при изменении условий',
    assessmentDateIso: new Date().toISOString().slice(0, 10),
    ppeTable: [],
    emergencyPlan: [],
    permitsTable: [],
    signatureRows: [],
    disclaimerNote:
      'Оценка рисков подлежит пересмотру при изменении условий труда, после инцидента и перед каждым новым этапом работ.',
  }
}

export function emptyHazard(): AsorHazardRow {
  return {
    id: crypto.randomUUID(),
    ordinal: 1,
    operationText: '',
    factorDescription: '',
    whoAtRisk: 'Операторы, персонал площадки',
    initialLikelihood: 0,
    initialSeverity: 0,
    protectiveMeasures: '',
    residualLikelihood: 0,
    residualSeverity: 0,
    residualRisk: '',
    responsiblePerson: '',
  }
}

export function emptyTask(order: number): AsorTaskBlock {
  return {
    id: crypto.randomUUID(),
    ordinal: order,
    taskTitle: '',
    hazards: [emptyHazard()],
  }
}

export function defaultApprovalRows(): AsorApprovalRow[] {
  return [
    {
      roleKey: 'filled_work_permitter',
      roleLabelRu: `ЗАПОЛНИЛ — ${PERMITTER_DOCUMENT_ROLE_LABEL}`,
      fullNamePrinted: '',
      badgeNo: '',
      dateIso: '',
      acknowledged: false,
    },
    {
      roleKey: 'reviewed_permit_issuer',
      roleLabelRu: `РАССМОТРЕНО — ${ISSUER_DOCUMENT_ROLE_LABEL}`,
      fullNamePrinted: '',
      badgeNo: '',
      dateIso: '',
      acknowledged: false,
    },
    {
      roleKey: 'acknowledged_work_supervisor',
      roleLabelRu: `ОЗНАКОМИЛСЯ ${PERFORMER_DOCUMENT_ROLE_LABEL}`,
      fullNamePrinted: '',
      badgeNo: '',
      dateIso: '',
      acknowledged: false,
    },
    {
      roleKey: 'approved_hse_uog',
      roleLabelRu: `СОГЛАСОВАЛ ${LEAD_EXPERT_DOCUMENT_ROLE_LABEL}`,
      fullNamePrinted: '',
      badgeNo: '',
      dateIso: '',
      acknowledged: false,
    },
  ]
}

export function emptyPpeBlock(): AsorPpeSelections {
  return {
    faceShield: false,
    arboristHelmet: false,
    helmetPainting: false,
    helmetWelding: false,
    helmetOtherNote: '',
    eyeChem: false,
    eyeCuttingGrinding: false,
    hearEarplugs: false,
    hearMuffs: false,
    hearTimeLimitNote: '',
    respDustMask: false,
    respCascade: false,
    respSCBA: false,
    respiratorTypeNote: false,
    respiratorTypeText: '',
    fallHarnessSystem: false,
    clothingDisposable: false,
    clothRainSuits: false,
    clothChem: false,
    clothWelding: false,
    apronLeather: false,
    apronChem: false,
    glovesCotton: false,
    glovesLeather: false,
    glovesChem: false,
    glovesWelding: false,
    glovesDielectric: false,
    glovesOtherNote: '',
    feetDielectricBoots: false,
    feetRubberBoots: false,
    signsHearing: false,
    signsDroppedObjects: false,
    signsRadiography: false,
    signsN2Blowdown: false,
    signsOtherNote: '',
    fenceDangerArea: false,
    fenceGasWorks: false,
    fenceOtherNote: '',
    extraRadioOther: false,
    extraRadioChannelNote: '',
    extraRequirementsOtherNote: '',
  }
}

export function emptyPermitDocuments(): AsorPermitDocuments {
  return {
    narjadPermit: false,
    electricalInstallationPermit: false,
    fireWorks: false,
    pidDiagram: false,
    gasHazardWorks: false,
    hazardousEnergyIsolation: false,
    radiographyWorks: false,
    liftingOperationsPlan: false,
    excavationPlan: false,
    confinedSpacePermit: false,
    simultaneousOpsSIMOPSPlan: false,
    otherDocsLine: '',
  }
}

export function emptyEmergency(): AsorEmergencySelections {
  return {
    confinedSpaceARSPlan: false,
    heightRescueInfoPack: false,
    otherEmergencyNote: '',
  }
}

/** Пустые строки блока пересменки (15 строк по форме). */
export function blankShiftLines(count = 15): AsorPersonRow[] {
  return Array.from({ length: count }, () => emptyPersonRow())
}

export function emptyAsorForm(): AsorForm {
  const d = new Date().toISOString().slice(0, 10)
  return {
    creationDateIso: d,
    workDurationText: '',
    tentativeNdReference: '',
    workScopeMarkdown: '',
    equipmentMarkdown: '',
    workPlacesText: '',
    shortTitleForNarjad: '',
    ppe: emptyPpeBlock(),
    toolsEquipmentList: '',
    staffReadProcedureListConfirmed: false,
    permitDocuments: emptyPermitDocuments(),
    emergency: emptyEmergency(),
    supplementaryResourcesMarkdown: '',
    tasks: [emptyTask(1)],
    matrixLikelihood: '',
    matrixSeverity: '',
    teamParticipatingNote: '',
    approvals: defaultApprovalRows(),
    declarationParagraphAccepted: false,
    declarationTeamRows: [],
    shiftTakeoverMembers: blankShiftLines(),
    selectedHseTemplateIds: [],
    nebosh: defaultNeboshMeta(),
  }
}

/** Матрица PR-001 (стр. 5): вероятность × тяжесть. */
export function deriveRiskFromMatrix(
  likelihood: AsorMatrixLikelihood,
  severity: AsorMatrixSeverity,
): MatrixCellRisk {
  if (!likelihood || !severity) return ''
  const L = likelihood
  const S = severity
  if (L === 'likely') {
    if (S === 'insignificant') return 'medium'
    if (S === 'moderateHarm') return 'high'
    if (S === 'significantHarm') return 'high'
  }
  if (L === 'rare') {
    if (S === 'insignificant') return 'low'
    if (S === 'moderateHarm') return 'medium'
    if (S === 'significantHarm') return 'high'
  }
  return ''
}

export const MATRIX_LIKELIHOOD_LABELS: Record<
  Exclude<AsorMatrixLikelihood, ''>,
  string
> = {
  likely: 'Вероятно',
  rare: 'Редко',
}

export const MATRIX_SEVERITY_LABELS: Record<
  Exclude<AsorMatrixSeverity, ''>,
  string
> = {
  insignificant: 'Незначительное',
  moderateHarm: 'Среднее',
  significantHarm: 'Значительное',
}

export const MATRIX_CELL_RISK_LABELS: Record<
  Exclude<MatrixCellRisk, ''>,
  string
> = {
  low: 'Низкий риск',
  medium: 'Средний риск',
  high: 'Высокий риск',
}

function normalizePerson(p: unknown): AsorPersonRow {
  if (!p || typeof p !== 'object') return emptyPersonRow()
  const x = p as Partial<AsorPersonRow>
  return {
    id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
    rolePrinted: String(x.rolePrinted ?? ''),
    fullNamePrinted: String(x.fullNamePrinted ?? ''),
    badgeNo: String(x.badgeNo ?? ''),
    dateIso: String(x.dateIso ?? ''),
    signatureAcknowledged: !!x.signatureAcknowledged,
  }
}

function normalizeHazard(h: unknown, ord: number): AsorHazardRow {
  if (!h || typeof h !== 'object') {
    return {
      ...emptyHazard(),
      ordinal: ord,
    }
  }
  const x = h as Partial<AsorHazardRow>
  const okRes: AsorTaskResidualRisk =
    x.residualRisk === 'low' ||
    x.residualRisk === 'medium' ||
    x.residualRisk === 'high'
      ? x.residualRisk
      : ''
  const initialL = parseNeboshScale(x.initialLikelihood)
  const initialS = parseNeboshScale(x.initialSeverity)
  const residualL = parseNeboshScale(x.residualLikelihood)
  const residualS = parseNeboshScale(x.residualSeverity)
  let residualRisk = okRes
  if (!residualRisk && residualL && residualS) {
    residualRisk = neboshBandToResidual(neboshRiskBand(neboshRiskScore(residualL, residualS)))
  }

  return {
    id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
    ordinal: typeof x.ordinal === 'number' ? x.ordinal : ord,
    operationText: String(x.operationText ?? ''),
    factorDescription: String(x.factorDescription ?? ''),
    whoAtRisk: String(x.whoAtRisk ?? 'Операторы, персонал площадки'),
    initialLikelihood: initialL,
    initialSeverity: initialS,
    protectiveMeasures: String(x.protectiveMeasures ?? ''),
    residualLikelihood: residualL,
    residualSeverity: residualS,
    residualRisk,
    responsiblePerson: String(x.responsiblePerson ?? ''),
  }
}

function normalizeTask(t: unknown, fallbackOrder: number): AsorTaskBlock {
  if (!t || typeof t !== 'object') return emptyTask(fallbackOrder)
  const x = t as Partial<AsorTaskBlock>
  const hz = Array.isArray(x.hazards)
    ? x.hazards.map((h, j) => normalizeHazard(h, j + 1))
    : [emptyHazard()]
  return {
    id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
    ordinal: typeof x.ordinal === 'number' ? x.ordinal : fallbackOrder,
    taskTitle: String(x.taskTitle ?? ''),
    hazards: hz.length > 0 ? hz : [emptyHazard()],
  }
}

/** Приводит частичные/старые сохранения к полной структуре (или undefined). */
export function normalizeAsorIncoming(raw: unknown): AsorForm | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object') return undefined
  const o = raw as Partial<AsorForm>
  const e = emptyAsorForm()
  const lk: AsorMatrixLikelihood =
    o.matrixLikelihood === 'likely' || o.matrixLikelihood === 'rare'
      ? o.matrixLikelihood
      : ''
  const sev: AsorMatrixSeverity =
    o.matrixSeverity === 'insignificant' ||
    o.matrixSeverity === 'moderateHarm' ||
    o.matrixSeverity === 'significantHarm'
      ? o.matrixSeverity
      : ''
  return {
    ...e,
    ...o,
    matrixLikelihood: lk,
    matrixSeverity: sev,
    ppe: { ...e.ppe, ...(o.ppe ?? {}) },
    permitDocuments: { ...e.permitDocuments, ...(o.permitDocuments ?? {}) },
    emergency: { ...e.emergency, ...(o.emergency ?? {}) },
    tasks:
      Array.isArray(o.tasks) && o.tasks.length > 0
        ? o.tasks.map((t, i) => normalizeTask(t, i + 1))
        : e.tasks,
    approvals:
      Array.isArray(o.approvals) && o.approvals.length === e.approvals.length
        ? defaultApprovalRows().map((row, i) => {
            const patch = o.approvals![i] as Partial<AsorApprovalRow>
            return { ...row, ...patch }
          })
        : e.approvals,
    declarationTeamRows: Array.isArray(o.declarationTeamRows)
      ? o.declarationTeamRows.map((p) => normalizePerson(p))
      : [],
    shiftTakeoverMembers:
      Array.isArray(o.shiftTakeoverMembers) &&
      o.shiftTakeoverMembers.length > 0
        ? o.shiftTakeoverMembers.map((p) => normalizePerson(p))
        : blankShiftLines(),
    selectedHseTemplateIds: Array.isArray(o.selectedHseTemplateIds)
      ? o.selectedHseTemplateIds.filter((id): id is string => typeof id === 'string')
      : [],
    nebosh: {
      ...defaultNeboshMeta(),
      ...e.nebosh,
      ...(o.nebosh ?? {}),
      ppeTable: Array.isArray((o.nebosh as { ppeTable?: unknown } | undefined)?.ppeTable)
        ? (o.nebosh as AsorNeboshMeta).ppeTable
        : e.nebosh.ppeTable,
      emergencyPlan: Array.isArray(
        (o.nebosh as { emergencyPlan?: unknown } | undefined)?.emergencyPlan,
      )
        ? (o.nebosh as AsorNeboshMeta).emergencyPlan
        : e.nebosh.emergencyPlan,
      permitsTable: Array.isArray(
        (o.nebosh as { permitsTable?: unknown } | undefined)?.permitsTable,
      )
        ? (o.nebosh as AsorNeboshMeta).permitsTable
        : e.nebosh.permitsTable,
      signatureRows: Array.isArray(
        (o.nebosh as { signatureRows?: unknown } | undefined)?.signatureRows,
      )
        ? (o.nebosh as AsorNeboshMeta).signatureRows
        : e.nebosh.signatureRows,
    },
    abr: normalizeAbrForm(o.abr),
  }
}
