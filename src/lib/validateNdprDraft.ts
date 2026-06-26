import { resolveDefaultNdprParticipantUids, sanitizeNdprApprovalUids } from '../config/defaultNdprSigners'
import type { DemoUser, PermitDraft } from '../types/domain'
import { resolvePerformerUidForPackage } from './permitAccess'
import { loadPprForm } from './pprAutosave'
import { resolveExecutorRows } from './resolveWorkerUid'

/** Минимальное число работников в составе бригады (F03). */
export const MIN_NDPR_EXECUTORS = 2

const FIELD_ISSUE_LABELS = {
  company: 'организацию',
  siteName: 'объект / локацию',
  title: 'наименование работ',
  workStages: 'этапы работ',
  toolsAndEquipment: 'инструменты и оборудование',
  performerUid: 'производителя работ',
  permitterUid: 'допускающего',
  issuerUid: 'выдающего НД',
  leadExpertUid: 'утверждающего НД',
} as const

export type NdprFieldIssueKey = keyof typeof FIELD_ISSUE_LABELS

const FIELD_ISSUE_ORDER: NdprFieldIssueKey[] = [
  'company',
  'siteName',
  'title',
  'workStages',
  'toolsAndEquipment',
  'performerUid',
  'permitterUid',
  'issuerUid',
  'leadExpertUid',
]

export function filledNdprExecutors(
  draft: Pick<PermitDraft, 'executors'>,
): PermitDraft['executors'] {
  return draft.executors.filter((ex) => ex.userUid.trim())
}

function countFilledExecutors(draft: PermitDraft): number {
  return filledNdprExecutors(draft).length
}

function pickText(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim()
    if (t) return t
  }
  return ''
}

/** Подставляет участников и поля из ППР, если в черновике пусто. */
export function prepareNdprDraftForValidation(
  draft: PermitDraft,
  user: DemoUser | null,
  directory: DemoUser[],
): PermitDraft {
  const ppr = loadPprForm()
  const defaults = resolveDefaultNdprParticipantUids(directory)
  const sanitized = sanitizeNdprApprovalUids(draft, directory)

  return {
    ...draft,
    ...sanitized,
    siteName: pickText(draft.siteName, ppr.siteName),
    title: pickText(draft.title, ppr.workTitle),
    workStages: pickText(draft.workStages, ppr.workStagesText, ppr.workDescription),
    toolsAndEquipment: pickText(draft.toolsAndEquipment, ppr.toolsAndEquipment),
    performerUid: pickText(
      resolvePerformerUidForPackage(sanitized.performerUid, user, directory),
      defaults.performerUid,
    ),
    permitterUid: pickText(sanitized.permitterUid, defaults.permitterUid),
    issuerUid: pickText(sanitized.issuerUid, defaults.issuerUid),
    leadExpertUid: pickText(sanitized.leadExpertUid, defaults.leadExpertUid),
    executors: resolveExecutorRows(filledNdprExecutors(draft), directory),
    f02: {
      ...draft.f02,
      ...sanitized.f02,
      company: pickText(draft.f02.company, ppr.contractorOrg),
    },
  }
}

function fieldIsEmpty(draft: PermitDraft, key: NdprFieldIssueKey): boolean {
  switch (key) {
    case 'company':
      return !draft.f02.company.trim()
    case 'siteName':
      return !draft.siteName.trim()
    case 'title':
      return !draft.title.trim()
    case 'workStages':
      return !draft.workStages.trim()
    case 'toolsAndEquipment':
      return !draft.toolsAndEquipment.trim()
    case 'performerUid':
      return !draft.performerUid.trim()
    case 'permitterUid':
      return !draft.permitterUid.trim()
    case 'issuerUid':
      return !draft.issuerUid.trim()
    case 'leadExpertUid':
      return !draft.leadExpertUid.trim()
    default:
      return false
  }
}

export function firstNdprFieldIssueKey(draft: PermitDraft): NdprFieldIssueKey | null {
  for (const key of FIELD_ISSUE_ORDER) {
    if (fieldIsEmpty(draft, key)) return key
  }
  return null
}

export function listNdprFieldIssueKeys(draft: PermitDraft): NdprFieldIssueKey[] {
  return FIELD_ISSUE_ORDER.filter((key) => fieldIsEmpty(draft, key))
}

export type NdprExecutorIssueKey = 'min_workers' | 'worker_selection'

export function listNdprExecutorIssueKeys(draft: PermitDraft): NdprExecutorIssueKey[] {
  if (countFilledExecutors(draft) < MIN_NDPR_EXECUTORS) {
    return ['min_workers']
  }
  return []
}

export function formatNdprFieldIssueMessage(key: NdprFieldIssueKey): string {
  return `Укажите ${FIELD_ISSUE_LABELS[key]}.`
}

export function formatNdprFieldIssuesMessage(keys: NdprFieldIssueKey[]): string | null {
  const first = keys[0]
  return first ? formatNdprFieldIssueMessage(first) : null
}

export function formatNdprExecutorIssuesMessage(keys: NdprExecutorIssueKey[]): string | null {
  if (keys.length === 0) return null
  if (keys.includes('min_workers')) {
    return `Добавьте минимум ${MIN_NDPR_EXECUTORS} человек в состав бригады.`
  }
  return 'Выберите работника в каждой добавленной строке.'
}

export function listNdprValidationIssues(draft: PermitDraft): string[] {
  const fieldKeys = listNdprFieldIssueKeys(draft)
  const executorKeys = listNdprExecutorIssueKeys(draft)
  const issues: string[] = []

  for (const key of fieldKeys) {
    issues.push(FIELD_ISSUE_LABELS[key])
  }
  if (executorKeys.includes('min_workers')) {
    issues.push(`минимум ${MIN_NDPR_EXECUTORS} работника в составе бригады`)
  }

  return issues
}

export function validateNdprDraft(draft: PermitDraft): string | null {
  const fieldKey = firstNdprFieldIssueKey(draft)
  if (fieldKey) return formatNdprFieldIssueMessage(fieldKey)

  const executorKeys = listNdprExecutorIssueKeys(draft)
  if (executorKeys.length > 0) {
    return formatNdprExecutorIssuesMessage([executorKeys[0]])
  }

  return null
}
