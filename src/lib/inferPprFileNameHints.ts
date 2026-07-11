import type { SpecialWorkActivity } from '../types/domain'
import { normalizeSpecialWorkActivities } from '../types/domain'
import { titleFromFileName } from './pprAttachment'
import { toReadableRussianTitle } from './pprWorkTitle'
import {
  inferPermissionActivitiesFromText,
  inferSpecialWorkActivitiesFromText,
  mergeSpecialWorkActivities,
} from './inferSpecialWorkActivityFromPpr'

const SITE_CODE_LABELS: Record<string, string> = {
  tgtu: 'ТГТУ',
  тгту: 'ТГТУ',
  hkok: 'НКОК',
  hkdk: 'НКОК',
  нкок: 'НКОК',
  nkok: 'НКОК',
}

const SITE_CODE_RE = /^(?:tgtu|тгту|hkok|hkdk|нкок|nkok)$/i

export type PprFileNameHints = {
  workTitle: string
  siteName: string
  customerOrg: string
  specialWorkActivities: SpecialWorkActivity[]
  workTasks: Array<{ taskTitle: string; workContent: string }>
}

function fileStem(fileName: string): string {
  return fileName
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
}

function parseSiteParts(tokens: string[]): { siteName: string; workTokens: string[] } {
  const sites: string[] = []
  const workTokens: string[] = []
  for (const raw of tokens) {
    const t = raw.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (SITE_CODE_RE.test(t)) {
      const label = SITE_CODE_LABELS[key] ?? t.toUpperCase()
      if (!sites.includes(label)) sites.push(label)
      continue
    }
    workTokens.push(t)
  }
  return {
    siteName: sites.join(' / '),
    workTokens,
  }
}

function workTitleFromTokens(workTokens: string[]): string {
  let title = workTokens
    .join(' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  title = title.replace(/^ппр\s+/i, '')
  title = title.replace(/^пор\s+по\s+/i, '')
  return toReadableRussianTitle(title)
}

function tasksFromTitle(title: string): Array<{ taskTitle: string; workContent: string }> {
  const t = title.toLowerCase()
  const tasks: Array<{ taskTitle: string; workContent: string }> = []
  if (/выгрузк/.test(t) && /загрузк/.test(t)) {
    tasks.push(
      {
        taskTitle: 'Выгрузка катализатора',
        workContent: 'Выгрузка катализатора с оборудования согласно ППР.',
      },
      {
        taskTitle: 'Загрузка катализатора',
        workContent: 'Загрузка катализатора в оборудование согласно ППР.',
      },
    )
  } else if (/выгрузк/.test(t)) {
    tasks.push({
      taskTitle: 'Выгрузка',
      workContent: 'Выгрузка согласно ППР.',
    })
  } else if (/загрузк/.test(t)) {
    tasks.push({
      taskTitle: 'Загрузка',
      workContent: 'Загрузка согласно ППР.',
    })
  }
  if (/очистк/.test(t)) {
    tasks.push({
      taskTitle: 'Очистка',
      workContent: 'Очистка согласно ППР.',
    })
  }
  if (/монтаж/.test(t)) {
    tasks.push({
      taskTitle: 'Монтаж',
      workContent: 'Монтаж согласно ППР.',
    })
  }
  if (/демонтаж/.test(t)) {
    tasks.push({
      taskTitle: 'Демонтаж',
      workContent: 'Демонтаж согласно ППР.',
    })
  }
  return tasks
}

function inferActivities(title: string, siteName: string): SpecialWorkActivity[] {
  const haystack = `${title}\n${siteName}`
  const merged = mergeSpecialWorkActivities(
    inferSpecialWorkActivitiesFromText(haystack),
    inferPermissionActivitiesFromText(haystack),
  )
  if (merged.length > 0) return merged
  if (/катализатор|выгрузк|загрузк|продувк|спуск\s+давлен|азот|газ/i.test(haystack)) {
    return normalizeSpecialWorkActivities(['gas_hazard', 'cold_works'])
  }
  return normalizeSpecialWorkActivities(['cold_works'])
}

/** Подсказки для НДПР из имени файла ППР, когда ИИ не извлёк данные. */
export function inferPprFileNameHints(fileName: string): PprFileNameHints {
  const stem = fileStem(fileName)
  const tokens = stem.split(/[_\s]+/).filter(Boolean)
  const { siteName, workTokens } = parseSiteParts(tokens)
  const workTitle =
    workTitleFromTokens(workTokens) ||
    toReadableRussianTitle(titleFromFileName(fileName).replace(/^ппр[_\s-]+/i, ''))
  const workTasks = tasksFromTitle(workTitle)
  const customerOrg =
    siteName.includes('ТГТУ') || /tgtu|hkok|hkdk|нкок/i.test(stem)
      ? 'ТОО «Урал Ойл энд Газ»'
      : ''

  return {
    workTitle,
    siteName,
    customerOrg,
    specialWorkActivities: inferActivities(workTitle, siteName),
    workTasks,
  }
}

export function mergeFileNameHintsIntoHaystack(
  fileName: string | undefined,
  haystack: string,
): string {
  if (!fileName?.trim()) return haystack
  const hints = inferPprFileNameHints(fileName)
  return [
    haystack,
    hints.workTitle,
    hints.siteName,
    hints.customerOrg,
    ...hints.workTasks.flatMap((t) => [t.taskTitle, t.workContent]),
  ]
    .filter(Boolean)
    .join('\n')
}
