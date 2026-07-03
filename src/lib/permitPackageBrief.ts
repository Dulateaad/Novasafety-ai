import { ABR_LABEL, RISK_ASSESSMENT_LABEL } from '../config/branding'
import {
  ISSUER_DOCUMENT_ROLE_LABEL,
  LEAD_EXPERT_DOCUMENT_ROLE_LABEL,
  PERFORMER_DOCUMENT_ROLE_LABEL,
  PERMITTER_DOCUMENT_ROLE_LABEL,
} from '../config/branding'
import type { DemoUser, Permit } from '../types/domain'
import {
  ZONE_CLASS_LABELS,
  formatSpecialWorkActivitiesLabels,
} from '../types/domain'
import { formatStoredDateTime } from './datetimeLocal'
import { parseToolsAndEquipmentList } from './toolsAndEquipmentFormat'
import { permitWorkDescriptionNdpr, permitWorkTitle } from './ndprWorkText'
import { permitShiftLabel } from './permitShiftLabel'

export type PermitPackageBrief = {
  regNo: string
  title: string
  siteName: string
  company: string
  workKind: string
  zoneClass: string
  category: number
  period: string
  shiftLabel: string
  description: string
  workStages: string
  toolsPreview: string
  toolsText: string
  toolsCount: number
  pdfParts: string[]
  performerName: string
  permitterName: string
  issuerName: string
  leadExpertName: string
  crewCount: number
  hasPprAttachment: boolean
  hasAbr: boolean
  hasRiskAssessment: boolean
}

function workDescription(permit: Permit): string {
  const raw = permitWorkDescriptionNdpr(permit)
  if (!raw) return ''
  if (raw.length <= 500) return raw
  return `${raw.slice(0, 497)}…`
}

function toolsPreview(permit: Permit): { text: string; count: number } {
  const raw =
    permit.toolsAndEquipment?.trim() || permit.ppr?.toolsAndEquipment?.trim() || ''
  const items = parseToolsAndEquipmentList(raw)
  if (items.length === 0) return { text: '', count: 0 }
  const preview = items.slice(0, 4).join('; ')
  const suffix = items.length > 4 ? ` и ещё ${items.length - 4}` : ''
  return { text: preview + suffix, count: items.length }
}

/** «2 рабочих», «1 рабочий» — для чипа на карточке наряда. */
export function formatCrewCountLabel(count: number, lang: 'ru' | 'en' = 'ru'): string {
  if (count <= 0) return ''
  if (lang === 'en') return count === 1 ? `${count} worker` : `${count} workers`
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} рабочий`
  return `${count} рабочих`
}

export function buildPermitPackageBrief(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
): PermitPackageBrief {
  const regNo = permit.registrationRefNo || permit.id.slice(0, 8)
  const abrStages = permit.asor?.abr?.stages.length ?? 0
  const taskCount = permit.asor?.tasks.length ?? 0
  const hazardCount =
    permit.asor?.tasks.reduce((n, t) => n + t.hazards.length, 0) ?? 0

  const pdfParts = ['Наряд-допуск (НДПР) — сводка, бригада, согласования']
  if (abrStages > 0) {
    pdfParts.push(`${ABR_LABEL} (${abrStages} этап.)`)
  }
  if (hazardCount > 0) {
    pdfParts.push(`${RISK_ASSESSMENT_LABEL} (${taskCount} задан., ${hazardCount} фактор.)`)
  }

  const crewCount =
    permit.asor?.declarationTeamRows.filter((r) => r.fullNamePrinted.trim()).length ??
    permit.executors.length

  const tools = toolsPreview(permit)
  const start = formatStoredDateTime(permit.f02.startDate)
  const end = formatStoredDateTime(permit.f02.endDate)
  const period =
    start !== '—' || end !== '—' ? `${start} — ${end}` : '—'

  return {
    regNo,
    title: permitWorkTitle(permit) || '—',
    siteName: permit.siteName || '—',
    company: permit.f02.company || '—',
    workKind: formatSpecialWorkActivitiesLabels(
      permit.specialWorkActivities,
      permit.specialWorkActivity,
    ),
    zoneClass: ZONE_CLASS_LABELS[permit.zoneClass],
    category: permit.category,
    period,
    shiftLabel: permitShiftLabel(permit) || '—',
    description: workDescription(permit),
    workStages: permit.workStages?.trim() || permit.ppr?.workStagesText?.trim() || '—',
    toolsPreview: tools.text,
    toolsText: tools.text,
    toolsCount: tools.count,
    pdfParts,
    performerName: resolveUser(permit.performerUid)?.displayName ?? '—',
    permitterName: resolveUser(permit.permitterUid)?.displayName ?? '—',
    issuerName: resolveUser(permit.issuerUid)?.displayName ?? '—',
    leadExpertName: resolveUser(permit.leadExpertUid)?.displayName ?? '—',
    crewCount,
    hasPprAttachment: Boolean(permit.ppr?.attachment),
    hasAbr: abrStages > 0,
    hasRiskAssessment: hazardCount > 0,
  }
}

export const BRIEF_ROLE_LABELS = {
  performer: PERFORMER_DOCUMENT_ROLE_LABEL,
  permitter: PERMITTER_DOCUMENT_ROLE_LABEL,
  issuer: ISSUER_DOCUMENT_ROLE_LABEL,
  leadExpert: LEAD_EXPERT_DOCUMENT_ROLE_LABEL,
} as const
