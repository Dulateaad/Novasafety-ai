import type { SpecialWorkActivity } from '../types/domain'
import type { PprForm } from '../types/ppr'

type ActivityRule = {
  activity: SpecialWorkActivity
  patterns: RegExp[]
}

/** Приоритет: от более специфичных видов работ к общим. */
const ACTIVITY_RULES: ActivityRule[] = [
  {
    activity: 'open_flame_fire',
    patterns: [
      /огнев(?:ые|ых)?\s+работ/i,
      /открыт[^\n]{0,24}источник[^\n]{0,12}огн/i,
      /наряд[^\n]{0,20}огнев/i,
      /свар(очн|к)[^\n]{0,40}работ/i,
      /резк[^\n]{0,20}металл/i,
      /газов(?:ая|ое)\s+резк/i,
    ],
  },
  {
    activity: 'radiographic',
    patterns: [/радиограф/i, /рентген/i, /гамма[^\n]{0,12}излуч/i],
  },
  {
    activity: 'confined_space',
    patterns: [
      /замкнут[^\n]{0,20}объ[её]м/i,
      /зпо\b/i,
      /confined\s+space/i,
      /работ[^\n]{0,20}в\s+колодц/i,
    ],
  },
  {
    activity: 'gas_hazard',
    patterns: [
      /взрывоопас/i,
      /h₂s|h2s/i,
      /сероводород/i,
      /в\s+газоопасн/i,
      /азотн(?:ая|ое|ого)\s+(?:установк|оборудован)/i,
      /продувк(?:а|и)\s+(?:трубопровод|шлейф|линии)/i,
      /спуск\s+давлен/i,
      /газоопасн(?:ые|ых)?\s+работ/i,
      /работ[^\n]{0,24}газоопас/i,
      /газоопасн(?:ая|ое|ый)\s+(?:зона|участ|площад)/i,
    ],
  },
  {
    activity: 'electrical',
    patterns: [
      /электр(?:омонтаж|оустанов|ические)/i,
      /под\s+напряжен/i,
      /электробезопасн/i,
      /электроустанов/i,
    ],
  },
  {
    activity: 'energy_isolation',
    patterns: [
      /\bloto\b/i,
      /блокировк[^\n]{0,20}энерг/i,
      /изоляц[^\n]{0,20}источник[^\n]{0,20}опасн/i,
      /отключен[^\n]{0,20}энерг/i,
    ],
  },
  {
    activity: 'work_at_height',
    patterns: [
      /работ[^\n]{0,24}на\s+высот/i,
      /высотн(?:ые|ых)?\s+работ/i,
      /работ[^\n]{0,16}с\s+высот/i,
      /люльк(?:а|и|е)?\b/i,
      /вышк(?:а|и|е)\b/i,
      /лес[аов]\b/i,
      /монтаж[^\n]{0,20}на\s+высот/i,
    ],
  },
  {
    activity: 'lifting_operations',
    patterns: [
      /грузопод(?:ъ|ь)?(?:ё|е)м/i,
      /такелаж/i,
      /строп(?:аль|ов)/i,
      /кран(?:ов|овые)?\s+работ/i,
      /под(?:ъ|ь)?(?:ё|е)м\s+груз/i,
      /автокран/i,
      /башенн(?:ый|ая|ого)?\s+кран/i,
      /г(?:\/|\.)?\s*п\s*(?:м|маш)/i,
      /под(?:ъ|ь)?(?:ё|е)мн(?:ый|ая|ое|ые)?\s+(?:кран|механизм|агрегат)/i,
      /манипулятор/i,
      /леб(?:ё|е)дк(?:а|и|у|ой)/i,
    ],
  },
  {
    activity: 'cold_works',
    patterns: [
      /холодн(?:ые|ых)?\s+работ/i,
      /холодный\s+наряд/i,
      /наряд[^\n]{0,20}холодн/i,
      /не\s+огнев/i,
      /без\s+открытого\s+огн/i,
      /очистк(?:а|и)\s+(?:трубопровод|шлейф|линии)/i,
      /пиг(?:а|ом)?\b/i,
    ],
  },
]

/** Текст ППР только по сути работ (без общих мер ТБ, где часто упоминают «на высоте»). */
export function buildPprWorkTypesHaystack(ppr: PprForm, docText?: string): string {
  const parts: string[] = [
    ppr.workTitle,
    ppr.workDescription,
    ppr.workStagesText,
    ppr.workVolume,
    ppr.toolsAndEquipment,
    ppr.workArea,
    ppr.controlMeasures?.workTitle ?? '',
    ...ppr.tasks.flatMap((t) => [t.taskTitle, t.workContent]),
    ...(ppr.controlMeasures?.items ?? [])
      .filter((item) => /^3\.|операци|этап|технолог/i.test(item.section))
      .flatMap((item) => [item.section, item.hazard]),
  ]
  if (docText?.trim()) {
    parts.push(filterOperationalWorkText(docText.slice(0, 12000)))
  }
  return parts.filter(Boolean).join('\n')
}

/** Собирает текст ППР для rule-based классификации вида работ. */
export function buildPprTextHaystack(ppr: PprForm, docText?: string): string {
  const parts: string[] = [
    ppr.workTitle,
    ppr.workDescription,
    ppr.workStagesText,
    ppr.workVolume,
    ppr.toolsAndEquipment,
    ppr.safetyMeasures,
    ppr.workArea,
    ppr.controlMeasures?.workTitle ?? '',
    ppr.controlMeasures?.markdown ?? '',
    ...(ppr.controlMeasures?.items ?? []).flatMap((item) => [
      item.section,
      item.hazard,
      ...item.controlMeasures,
    ]),
    ...ppr.tasks.flatMap((t) => [t.taskTitle, t.workContent, t.safetyMeasures]),
  ]
  if (docText?.trim()) parts.push(docText)
  return parts.filter(Boolean).join('\n')
}

/** Три вида работ, для которых нужны спецразрешения (ГО / ОР / ЗП). */
const PERMISSION_ACTIVITY_RULES: ActivityRule[] = [
  {
    activity: 'gas_hazard',
    patterns: [
      /разрешени[^\n]{0,60}газоопас/i,
      /газоопас[^\n]{0,40}разрешени/i,
      /наряд[^\n]{0,30}газоопас/i,
      /нд(?:пр)?[^\n]{0,24}[-\s]*го\b/i,
      /\bго\b[^\n]{0,30}разреш/i,
    ],
  },
  {
    activity: 'open_flame_fire',
    patterns: [
      /разрешени[^\n]{0,60}огнев/i,
      /огнев[^\n]{0,40}разрешени/i,
      /наряд[^\n]{0,30}огнев/i,
      /нд(?:пр)?[^\n]{0,24}[-\s]*ор\b/i,
      /\bор\b[^\n]{0,30}разреш/i,
      /огнев(?:ые|ых)?\s+работ/i,
      /открыт[^\n]{0,24}источник[^\n]{0,12}огн/i,
    ],
  },
  {
    activity: 'confined_space',
    patterns: [
      /разрешени[^\n]{0,60}замкнут/i,
      /замкнут[^\n]{0,40}(?:простран|объ[её]м)/i,
      /вход[^\n]{0,30}замкнут/i,
      /нд(?:пр)?[^\n]{0,24}[-\s]*зп\b/i,
      /\bзп\b[^\n]{0,30}разреш/i,
      /\bзпо\b/i,
    ],
  },
]

export function inferPermissionActivitiesFromText(haystack: string): SpecialWorkActivity[] {
  const text = haystack.trim()
  if (!text) return []
  const found: SpecialWorkActivity[] = []
  for (const { activity, patterns } of PERMISSION_ACTIVITY_RULES) {
    if (patterns.some((pattern) => pattern.test(text))) {
      found.push(activity)
    }
  }
  return mergeSpecialWorkActivities(found)
}

/** Объединяет списки видов работ без дубликатов (cold_works убирается при наличии специфичных). */
export function mergeSpecialWorkActivities(
  ...sources: SpecialWorkActivity[][]
): SpecialWorkActivity[] {
  const seen = new Set<SpecialWorkActivity>()
  const out: SpecialWorkActivity[] = []
  for (const list of sources) {
    for (const activity of list) {
      if (!seen.has(activity)) {
        seen.add(activity)
        out.push(activity)
      }
    }
  }
  if (!out.length) return []
  const specific = out.filter((a) => a !== 'cold_works')
  if (specific.length > 1 && out.includes('cold_works')) {
    return specific
  }
  return out
}

export function inferSpecialWorkActivitiesFromText(
  haystack: string,
): SpecialWorkActivity[] {
  const text = filterOperationalWorkText(haystack.trim())
  if (!text) return []

  const found: SpecialWorkActivity[] = []
  for (const { activity, patterns } of ACTIVITY_RULES) {
    if (patterns.some((pattern) => pattern.test(text))) {
      found.push(activity)
    }
  }
  const fromPermissions = inferPermissionActivitiesFromText(text)
  const merged = mergeSpecialWorkActivities(found, fromPermissions)
  if (!merged.length) {
    if (text.length >= 30) return ['cold_works']
    return []
  }
  return merged
}

/** Убирает строки общих мер ТБ — они часто дают ложные «на высоте», «газоопасные» и т.п. */
export function filterOperationalWorkText(haystack: string): string {
  return haystack
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return false
      if (/^3\.\d+/.test(t)) return true
      if (/^(?:этап|операци|описание|инструмент|оборудован|объ[её]м|работ)/i.test(t)) {
        return true
      }
      if (
        /^(?:\d+[.)]\s*)?(?:меры|требован|запрещ|необходим|обязан|использовать|применять|до\s+начала|после\s+окончан)/i.test(
          t,
        )
      ) {
        return false
      }
      if (/техник(?:а|и)\s+безопасност/i.test(t) && !/^3\./.test(t)) return false
      if (/опасн(?:ые|ых)\s+зон/i.test(t) && !/^3\./.test(t)) return false
      return true
    })
    .join('\n')
}

/** Определяет основной особый вид работ по содержанию ППР. */
export function inferSpecialWorkActivityFromText(haystack: string): SpecialWorkActivity {
  const activities = inferSpecialWorkActivitiesFromText(haystack)
  if (activities.includes('open_flame_fire')) return 'open_flame_fire'
  return activities[0] ?? 'cold_works'
}

export function inferSpecialWorkActivitiesFromPpr(
  ppr: PprForm,
  docText?: string,
): SpecialWorkActivity[] {
  return inferSpecialWorkActivitiesFromText(buildPprWorkTypesHaystack(ppr, docText))
}

export function inferSpecialWorkActivityFromPpr(
  ppr: PprForm,
  docText?: string,
): SpecialWorkActivity {
  return inferSpecialWorkActivityFromText(buildPprTextHaystack(ppr, docText))
}
