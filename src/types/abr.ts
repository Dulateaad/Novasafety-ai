import { PERFORMER_DOCUMENT_ROLE_LABEL } from '../config/branding'

const ABR_APPROVAL_ROLE_LABELS = [
  'Производитель работ',
  'Допускающий',
  'Выдающий НД',
  'Утверждающий НД',
] as const

function emptyAbrApprovalSigners(): AbrNamedPerson[] {
  return ABR_APPROVAL_ROLE_LABELS.map((roleLabel) => ({
    ...emptyAbrNamedPerson(),
    roleLabel,
  }))
}

export interface AbrStageRow {
  id: string
  order: number
  title: string
  hazardNumbers: number[]
  controlNumbers: number[]
}

export function ensureAbrStageId(stage: Partial<AbrStageRow>): string {
  return typeof stage.id === 'string' && stage.id.trim() ? stage.id : crypto.randomUUID()
}

export interface AbrBriefingAnswers {
  topHazardsAndControls: string
  stopScenarios: string
  morMentors: string
}

export interface AbrPostWorkAnswers {
  doneWell: string
  doneWrong: string
  improvements: string
  pprUsage: string
}

/** ФИО и № пропуска для подписей в конце АБР. */
export interface AbrNamedPerson {
  fullName: string
  badgeNo: string
  roleLabel: string
}

export function emptyAbrNamedPerson(): AbrNamedPerson {
  return { fullName: '', badgeNo: '', roleLabel: '' }
}

export interface AbrForm {
  workLocation: string
  permitNo: string
  dateIso: string
  shiftDay: boolean
  shiftNight: boolean
  jobDescription: string
  stages: AbrStageRow[]
  briefing: AbrBriefingAnswers
  postWork: AbrPostWorkAnswers
  /** Бригада — подтверждение понимания АБР (из executors НДПР). */
  crewAcknowledgments: AbrNamedPerson[]
  /** Производитель работ (performerUid НДПР). */
  workSupervisor: AbrNamedPerson
  /** Допускающий на участке (permitterUid НДПР). */
  areaPermitter: AbrNamedPerson
  /** Участники согласования НДПР — 4 роли с ФИО. */
  approvalSigners: AbrNamedPerson[]
  generatedAtIso: string
}

export function emptyAbrForm(): AbrForm {
  return {
    workLocation: '',
    permitNo: '',
    dateIso: new Date().toISOString().slice(0, 10),
    shiftDay: false,
    shiftNight: false,
    jobDescription: '',
    stages: [],
    briefing: { topHazardsAndControls: '', stopScenarios: '', morMentors: '' },
    postWork: { doneWell: '', doneWrong: '', improvements: '', pprUsage: '' },
    crewAcknowledgments: [],
    workSupervisor: { ...emptyAbrNamedPerson(), roleLabel: PERFORMER_DOCUMENT_ROLE_LABEL },
    areaPermitter: {
      ...emptyAbrNamedPerson(),
      roleLabel: 'Ежедневная проверка Допускающий на участке',
    },
    approvalSigners: emptyAbrApprovalSigners(),
    generatedAtIso: '',
  }
}

export function normalizeAbrForm(raw: unknown): AbrForm | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Partial<AbrForm>
  const e = emptyAbrForm()
  const stages = Array.isArray(o.stages)
    ? o.stages
        .map((s, i) => {
          if (!s || typeof s !== 'object') return null
          const row = s as Partial<AbrStageRow>
          const title = String(row.title ?? '').trim()
          if (!title) return null
          return {
            id: ensureAbrStageId(row),
            order: Number(row.order) || i + 1,
            title,
            hazardNumbers: Array.isArray(row.hazardNumbers)
              ? row.hazardNumbers.map((n) => Number(n)).filter((n) => n >= 1 && n <= 58)
              : [],
            controlNumbers: Array.isArray(row.controlNumbers)
              ? row.controlNumbers.map((n) => Number(n)).filter((n) => n >= 1 && n <= 58)
              : [],
          } satisfies AbrStageRow
        })
        .filter((x): x is AbrStageRow => x !== null)
    : []
  return {
    ...e,
    workLocation: String(o.workLocation ?? e.workLocation).trim(),
    permitNo: String(o.permitNo ?? e.permitNo).trim(),
    dateIso: String(o.dateIso ?? e.dateIso).slice(0, 10),
    shiftDay: Boolean(o.shiftDay),
    shiftNight: Boolean(o.shiftNight),
    jobDescription: String(o.jobDescription ?? e.jobDescription).trim(),
    stages,
    briefing: {
      topHazardsAndControls: String(o.briefing?.topHazardsAndControls ?? '').trim(),
      stopScenarios: String(o.briefing?.stopScenarios ?? '').trim(),
      morMentors: String(o.briefing?.morMentors ?? '').trim(),
    },
    postWork: {
      doneWell: String(o.postWork?.doneWell ?? '').trim(),
      doneWrong: String(o.postWork?.doneWrong ?? '').trim(),
      improvements: String(o.postWork?.improvements ?? '').trim(),
      pprUsage: String(o.postWork?.pprUsage ?? '').trim(),
    },
    crewAcknowledgments: Array.isArray(o.crewAcknowledgments)
      ? o.crewAcknowledgments.map((p) => normalizeAbrNamedPerson(p))
      : [],
    workSupervisor: normalizeAbrNamedPerson(o.workSupervisor, PERFORMER_DOCUMENT_ROLE_LABEL),
    areaPermitter: normalizeAbrNamedPerson(
      o.areaPermitter,
      'Ежедневная проверка Допускающий на участке',
    ),
    approvalSigners:
      Array.isArray(o.approvalSigners) && o.approvalSigners.length > 0
        ? o.approvalSigners.map((p, i) =>
            normalizeAbrNamedPerson(
              p,
              ABR_APPROVAL_ROLE_LABELS[i] ?? '',
            ),
          )
        : emptyAbrApprovalSigners().map((slot, i) => {
            if (i === 0) return normalizeAbrNamedPerson(o.workSupervisor, slot.roleLabel)
            if (i === 1) return normalizeAbrNamedPerson(o.areaPermitter, slot.roleLabel)
            return { ...slot }
          }),
    generatedAtIso: String(o.generatedAtIso ?? '').trim(),
  }
}

function normalizeAbrNamedPerson(raw: unknown, defaultRole = ''): AbrNamedPerson {
  const e = emptyAbrNamedPerson()
  if (!raw || typeof raw !== 'object') {
    return { ...e, roleLabel: defaultRole || e.roleLabel }
  }
  const p = raw as Partial<AbrNamedPerson>
  return {
    fullName: String(p.fullName ?? '').trim(),
    badgeNo: String(p.badgeNo ?? '').trim(),
    roleLabel: String(p.roleLabel ?? defaultRole).trim(),
  }
}
