import type { PermitDraft, SpecialWorkActivity, ZoneClass } from '../types/domain'
import {
  applySpecialWorkActivity,
  coerceSpecialWorkActivity,
  coerceZoneClass,
  normalizeSpecialWorkActivities,
  primarySpecialWorkActivity,
} from '../types/domain'
import type { PprForm, PprTaskBlock } from '../types/ppr'
import { emptyPprTask } from '../types/ppr'
import type { ControlMeasuresAiPayload } from './pprControlMeasuresParse'
import { effectivePprWorkTitle } from './narjadTitle'
import {
  restoreNewPermitDraftFromSession,
  saveNewPermitDraftToSession,
} from './newPermitDraftAutosave'
import { enrichPprNdprFieldsSync } from './pprNdprRules'
import { inferPtwSiteFromPpr } from './inferPtwSiteFromPpr'
import {
  buildPprTextHaystack,
  inferPermissionActivitiesFromText,
  inferSpecialWorkActivitiesFromPpr,
  inferSpecialWorkActivitiesFromText,
  mergeSpecialWorkActivities,
} from './inferSpecialWorkActivityFromPpr'
import { inferZoneClassFromPpr } from './inferZoneClassFromPpr'
import { inferContractorOrgFromPpr } from './inferContractorOrgFromPpr'
import {
  filterToolsAgainstWorkTasks,
  normalizeToolsAndEquipmentText,
} from './toolsAndEquipmentFormat'

export type PprNdprExtract = {
  workDescription: string
  workStages: string
  workVolume: string
  toolsAndEquipment?: string
  tasks: PprTaskBlock[]
  contractorOrg?: string
  siteName?: string
  zoneClass?: ZoneClass
  specialWorkActivity?: SpecialWorkActivity
  specialWorkActivities?: SpecialWorkActivity[]
}

/** Убирает нумерацию ППР (3.1, Этап 1), маркеры и номера страниц. */
export function stripStageNumbering(line: string): string {
  let t = line.replace(/\s+/g, ' ').trim()
  t = t.replace(/^[-–—•·]\s*/, '')
  t = t.replace(/^\d+[.)]\s+/, '')
  t = t.replace(/^\d+(?:\.\d+)*\s+/, '')
  t = t.replace(/^Этап\s+\d+\s*[.:–—-]?\s*/i, '')
  t = t.replace(/\s+\d{1,3}\s*$/, '')
  return polishStageTitle(t)
}

function polishStageTitle(title: string): string {
  return title.replace(/^Сброс давление\b/i, 'Сброс давления').trim()
}

/** Заголовки этапов из разделов 2–3 (3.1… или пункты с «;»). */
export function extractStageTitlesFromText(raw: string): string[] {
  const titles: string[] = []
  const seen = new Set<string>()
  const push = (line: string) => {
    const title = stripStageNumbering(line.replace(/;\s*$/, ''))
    if (title.length < 8) return
    const key = title.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    titles.push(title)
  }

  const re = /(?:^|\n)\s*\d+\.\d+(?:\.\d+)?\s+([^\n]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    push(match[1])
  }
  if (titles.length > 0) return titles

  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.length < 15) continue
    if (
      t.endsWith(';') ||
      /^(Организация|Поэтапное|Продувка|Выполнение|Очистка|В целях|До начала|После )/i.test(
        t,
      )
    ) {
      push(t)
    }
  }
  return titles
}

/** Этапы по пунктам: название + описание (включая объём/операции этапа). */
export function formatWorkStagesWithDescriptions(tasks: PprTaskBlock[]): string {
  const rows = tasks.filter((t) => t.taskTitle.trim() || t.workContent.trim())
  if (rows.length === 0) return ''

  return rows
    .map((t, i) => {
      const n = t.ordinal || i + 1
      const title = stripStageNumbering(
        t.taskTitle.trim() || `Этап ${n}`,
      )
      const body = t.workContent.trim()
      return body ? `${n}. ${title}\n${body}` : `${n}. ${title}`
    })
    .join('\n\n')
}

export function formatWorkStagesFromTasks(tasks: PprTaskBlock[]): string {
  const withDesc = formatWorkStagesWithDescriptions(tasks)
  if (withDesc) return withDesc

  const titles = tasks
    .filter((t) => t.taskTitle.trim() || t.workContent.trim())
    .map((t, i) =>
      stripStageNumbering(t.taskTitle.trim() || `Этап ${t.ordinal || i + 1}`),
    )
    .filter((t) => t.length > 2)
  if (titles.length > 0) return titles.join('\n')

  return formatWorkStagesAsList(
    tasks
      .map((t, i) => {
        const title = stripStageNumbering(
          t.taskTitle.trim() || `Этап ${t.ordinal || i + 1}`,
        )
        const body = t.workContent.trim()
        return body ? `${title}\n${body}` : title
      })
      .join('\n\n'),
  )
}

/** Текст описания — маркированный список (каждый пункт с «•»). */
export function formatTextAsBulletList(raw: string): string {
  const t = raw.trim()
  if (!t) return ''

  if (t.includes('•')) {
    return t
      .split('\n')
      .map((l) => {
        const s = l.trim()
        if (!s) return ''
        return s.startsWith('•') ? s : `• ${s}`
      })
      .filter(Boolean)
      .join('\n')
  }

  let lines = t
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-–—•·]\s*/, '').replace(/^\d+[.)]\s+/, ''))

  if (lines.length === 1) {
    const bySemi = lines[0].split(/;\s+/)
    if (bySemi.length >= 2) {
      lines = bySemi.map((s) => s.trim()).filter((s) => s.length > 3)
    }
  }

  return lines
    .filter((l) => l.length > 2)
    .map((l) => `• ${l}`)
    .join('\n')
}

/** Этапы работ — чистые строки без нумерации 3.1 и без маркеров «•». */
export function formatWorkStagesAsList(raw: string): string {
  const titles = extractStageTitlesFromText(raw)
  if (titles.length > 0) return titles.join('\n')

  const readable = formatWorkStagesReadable(raw)
  if (!readable) return ''
  return readable
    .split('\n')
    .map((l) => stripStageNumbering(l))
    .filter((l) => l.length > 8)
    .join('\n')
}

/** Разбивает слепленный текст этапов (3.1 … 8 3.2 …) на читабельные строки. */
export function formatWorkStagesReadable(raw: string): string {
  let t = raw.trim()
  if (!t) return ''

  const lines = t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (lines.length >= 2 && lines.filter((l) => /^\d+\.\d+/.test(l)).length >= 2) {
    return lines.join('\n')
  }

  t = t.replace(/\s+/g, ' ')
  t = t.replace(/(\S)\s+(\d{1,3})\s+(?=(\d+\.\d+(?:\.\d+)?)\s)/g, '$1\n\n$3 ')
  t = t.replace(/(^|\s)(\d{1,3})\s+(?=(\d+\.\d+(?:\.\d+)?)\s)/g, '\n\n$2 ')
  t = t.replace(/\s+(?=(\d+\.\d+(?:\.\d+)?)\s+[A-Za-zА-Яа-яЁё])/g, '\n\n')

  return t
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeWorkStagesField(raw: unknown): string {
  if (typeof raw === 'string') return formatWorkStagesAsList(raw.trim())
  if (Array.isArray(raw)) {
    return formatWorkStagesAsList(
      raw
        .map((s) => String(s).trim())
        .filter(Boolean)
        .join('\n'),
    )
  }
  return ''
}

function tasksFromPayload(payload: ControlMeasuresAiPayload): PprTaskBlock[] | null {
  const raw = (payload as { workTasks?: unknown }).workTasks
  if (!Array.isArray(raw)) return null
  const tasks = raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((row, i) => ({
      id: crypto.randomUUID(),
      ordinal: i + 1,
      taskTitle: stripStageNumbering(
        String(row.taskTitle ?? row.stage ?? `Этап ${i + 1}`).trim(),
      ),
      workContent: String(
        row.workContent ?? row.description ?? row.content ?? row.volume ?? '',
      ).trim(),
      safetyMeasures: String(row.safetyMeasures ?? '').trim(),
    }))
    .filter((t) => t.taskTitle || t.workContent)
  return tasks.length > 0 ? tasks : null
}

export function normalizeNdprFromPayload(
  payload: ControlMeasuresAiPayload,
): PprNdprExtract {
  const tasks = tasksFromPayload(payload) ?? [emptyPprTask(1)]
  let workStages = formatWorkStagesWithDescriptions(tasks)
  if (!workStages) {
    workStages = normalizeWorkStagesField(
      (payload as { workStages?: unknown }).workStages,
    )
  }
  if (!workStages) workStages = formatWorkStagesFromTasks(tasks)
  const toolsAndEquipment = filterToolsAgainstWorkTasks(
    normalizeToolsAndEquipmentText(
      String((payload as { toolsAndEquipment?: unknown }).toolsAndEquipment ?? ''),
    ),
    [
      workStages,
      ...tasks.map((t) => t.taskTitle),
      ...tasks.map((t) => t.workContent),
    ],
  )
  const contractorOrg = String(
    (payload as { contractorOrg?: unknown }).contractorOrg ?? '',
  ).trim()
  const siteName = String((payload as { siteName?: unknown }).siteName ?? '').trim()
  const zoneRaw = (payload as { zoneClass?: unknown }).zoneClass
  const zoneClass =
    zoneRaw !== undefined && zoneRaw !== null && zoneRaw !== ''
      ? coerceZoneClass(zoneRaw)
      : undefined
  const activityRaw = (payload as { specialWorkActivity?: unknown })
    .specialWorkActivity
  const activitiesRaw = (payload as { specialWorkActivities?: unknown })
    .specialWorkActivities
  let specialWorkActivities = normalizeSpecialWorkActivities(
    Array.isArray(activitiesRaw) && activitiesRaw.length === 0
      ? undefined
      : (activitiesRaw ?? activityRaw),
    typeof activityRaw === 'string' && activityRaw.trim()
      ? {
          single: coerceSpecialWorkActivity(activityRaw, 'cold'),
        }
      : undefined,
  )
  const activityHaystack = [
    payload.workTitle,
    workStages,
    toolsAndEquipment,
    ...tasks.map((t) => t.taskTitle),
    ...tasks.map((t) => t.workContent),
    ...(Array.isArray((payload as { controlMeasures?: { section?: string; hazard?: string }[] }).controlMeasures)
      ? (payload as { controlMeasures: { section?: string; hazard?: string }[] }).controlMeasures.flatMap(
          (item) => [item.section ?? '', item.hazard ?? ''],
        )
      : []),
  ].join('\n')
  specialWorkActivities = mergeSpecialWorkActivities(
    specialWorkActivities,
    inferSpecialWorkActivitiesFromText(activityHaystack),
    inferPermissionActivitiesFromText(activityHaystack),
  )
  if (!specialWorkActivities.length) {
    specialWorkActivities =
      activityHaystack.trim().length >= 30 ? ['cold_works'] : []
  }
  const specialWorkActivity = primarySpecialWorkActivity(specialWorkActivities)

  return {
    workDescription: '',
    workStages,
    workVolume: '',
    toolsAndEquipment,
    tasks,
    ...(contractorOrg ? { contractorOrg } : {}),
    ...(siteName ? { siteName } : {}),
    ...(zoneClass ? { zoneClass } : {}),
    specialWorkActivities,
    specialWorkActivity,
  }
}

export function applyNdprExtractToPprForm(
  form: PprForm,
  extract: PprNdprExtract,
): PprForm {
  const tasks =
    extract.tasks.some((t) => t.taskTitle.trim() || t.workContent.trim())
      ? extract.tasks
      : form.tasks
  const workStagesText =
    formatWorkStagesWithDescriptions(tasks) ||
    formatWorkStagesAsList(extract.workStages || form.workStagesText)
  return {
    ...form,
    workDescription: '',
    workVolume: '',
    workStagesText,
    toolsAndEquipment: normalizeToolsAndEquipmentText(
      extract.toolsAndEquipment || form.toolsAndEquipment,
    ),
    ...(extract.contractorOrg?.trim()
      ? { contractorOrg: extract.contractorOrg.trim() }
      : {}),
    ...(extract.siteName?.trim() ? { siteName: extract.siteName.trim().slice(0, 200) } : {}),
    tasks,
  }
}

type PermitDraftPprPatch = Partial<Omit<PermitDraft, 'f02'>> & {
  f02?: Partial<PermitDraft['f02']>
}

export function ndprPatchFromPpr(
  ppr: PprForm,
  opts?: { docText?: string },
): PermitDraftPprPatch {
  const title = effectivePprWorkTitle(ppr)
  const workStages =
    ppr.workStagesText.trim() ||
    formatWorkStagesWithDescriptions(ppr.tasks) ||
    formatWorkStagesFromTasks(ppr.tasks)
  const patch: PermitDraftPprPatch = {}
  if (title) patch.title = title
  patch.workDescription = ''
  patch.workVolume = ''
  if (workStages) patch.workStages = workStages
  const inferredSite = inferPtwSiteFromPpr(ppr, opts?.docText)
  if (inferredSite) {
    patch.siteName = inferredSite
  }

  const zoneClass = inferZoneClassFromPpr(ppr, opts?.docText)
  if (zoneClass) patch.zoneClass = zoneClass

  if (ppr.toolsAndEquipment.trim()) {
    patch.toolsAndEquipment = filterToolsAgainstWorkTasks(
      normalizeToolsAndEquipmentText(ppr.toolsAndEquipment),
      [
        workStages,
        ...ppr.tasks.map((t) => t.taskTitle),
        ...ppr.tasks.map((t) => t.workContent),
      ],
    )
  }
  const haystack = buildPprTextHaystack(ppr, opts?.docText)
  const fromWorkTypes = inferSpecialWorkActivitiesFromPpr(ppr, opts?.docText)
  const fromFullText = inferSpecialWorkActivitiesFromText(haystack)
  const fromPermissions = inferPermissionActivitiesFromText(haystack)
  const mergedActivities = mergeSpecialWorkActivities(
    fromWorkTypes,
    fromFullText,
    fromPermissions,
  )
  const finalActivities = mergedActivities.length
    ? mergedActivities
    : (['cold_works'] as SpecialWorkActivity[])
  const specialWorkActivity = primarySpecialWorkActivity(finalActivities)
  const derived = applySpecialWorkActivity(specialWorkActivity)
  patch.specialWorkActivities = finalActivities
  patch.specialWorkActivity = specialWorkActivity
  patch.permitType = derived.permitType
  patch.category = derived.category

  const f02Patch: Partial<PermitDraft['f02']> = {}
  const company = inferContractorOrgFromPpr(ppr, opts?.docText)
  if (company) f02Patch.company = company
  if (ppr.periodStart) {
    f02Patch.startDate = ppr.periodStart
  }
  if (Object.keys(f02Patch).length > 0) {
    patch.f02 = f02Patch
  }
  return patch
}

export function mergePermitDraftWithPpr(
  draft: PermitDraft,
  ppr: PprForm,
  opts?: { docText?: string },
): PermitDraft {
  const patch = ndprPatchFromPpr(enrichPprNdprFieldsSync(ppr), opts)
  const { f02: f02Patch, ...restPatch } = patch
  const f02: PermitDraft['f02'] = {
    ...draft.f02,
    ...f02Patch,
    ...(f02Patch?.company ? { company: f02Patch.company } : {}),
    ...(ppr.periodEnd ? { endDate: ppr.periodEnd } : {}),
  }
  return {
    ...draft,
    ...restPatch,
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.workStages ? { workStages: patch.workStages } : {}),
    ...(patch.toolsAndEquipment ? { toolsAndEquipment: patch.toolsAndEquipment } : {}),
    ...(patch.siteName ? { siteName: patch.siteName } : {}),
    f02,
    ppr,
  }
}

export function applyPprToNdprSession(ppr: PprForm): PermitDraft {
  // mergePermitDraftWithPpr сохраняет executors из текущего черновика. НЕ обнуляем
  // их здесь: goToNdprFromPpr может вызваться повторно/с задержкой (медленный
  // анализ PDF разрешается уже после того, как пользователь ввёл бригаду, либо
  // промис анализа долетает после ухода со страницы ППР) — обнуление стирало бы
  // введённых работников. Для нового наряда сессия уже очищена (?fresh=1 /
  // clearPackageSession), поэтому здесь executors и так пуст — фантомов не будет.
  const merged = mergePermitDraftWithPpr(restoreNewPermitDraftFromSession(), ppr)
  // Через saveNewPermitDraftToSession: оно вырезает тяжёлое поле ppr (вложение
  // PDF дублирует PPR_FORM_STORAGE_KEY и переполняет квоту sessionStorage).
  saveNewPermitDraftToSession(merged)
  return merged
}
