import type { PprForm, PprTaskBlock } from '../types/ppr'
import { emptyPprTask } from '../types/ppr'
import type { PprNdprExtract } from './pprNdprExtract'
import {
  extractStageTitlesFromText,
  formatWorkStagesAsList,
  formatWorkStagesFromTasks,
  formatWorkStagesReadable,
  formatWorkStagesWithDescriptions,
  stripStageNumbering,
} from './pprNdprExtract'
import {
  filterToolsAgainstWorkTasks,
  isValidToolsAndEquipmentItem,
  mergeToolsAndEquipmentSources,
  parseToolsAndEquipmentList,
  sanitizeToolsAndEquipmentItem,
} from './toolsAndEquipmentFormat'
import { matchPtwSiteFromText } from '../config/ptwSites'
import { buildPprTextHaystack } from './inferSpecialWorkActivityFromPpr'
import { inferContractorOrgFromPpr } from './inferContractorOrgFromPpr'
import { normalizePprWorkTitle } from './narjadTitle'

function sliceBetweenAt(
  text: string,
  start: string,
  ends: string[],
  fromIndex: number,
): string {
  const from = text.slice(fromIndex).search(new RegExp(start, 'i'))
  if (from < 0) return ''
  const bodyStart = fromIndex + from + start.length
  let endIdx = text.length
  for (const end of ends) {
    const rel = text.slice(bodyStart).search(new RegExp(end, 'i'))
    if (rel >= 0 && bodyStart + rel < endIdx) endIdx = bodyStart + rel
  }
  return text.slice(bodyStart, endIdx).trim()
}

function firstMatchBlock(
  text: string,
  starts: string[],
  ends: string[],
  opts?: { preserveLines?: boolean; minLength?: number },
): string {
  const normalize = (block: string) =>
    opts?.preserveLines
      ? block.replace(/\r\n/g, '\n').trim()
      : block.replace(/\s+/g, ' ').trim()
  const minLength = opts?.minLength ?? 40

  let best = ''
  for (const start of starts) {
    const re = new RegExp(start, 'gi')
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      const block = sliceBetweenAt(text, start, ends, match.index)
      if (block.length >= minLength && block.length > best.length) {
        best = block
      }
    }
  }
  return best ? normalize(best) : ''
}

function tasksFromOpsBlock(opsBlock: string): PprTaskBlock[] {
  const readable = formatWorkStagesReadable(opsBlock)
  const chunks = readable.includes('\n\n')
    ? readable.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)
    : readable.split('\n').map((s) => s.trim()).filter((s) => /^\d+\.\d+/.test(s))

  if (chunks.length > 0) {
    return chunks.map((chunk, i) => {
      const head = chunk.match(/^(\d+(?:\.\d+)*)\s+(.+?)(?:\s+\d{1,3})?(?:\n([\s\S]*))?$/)
      const taskTitle = head
        ? stripStageNumbering(head[2])
        : stripStageNumbering(chunk.split('\n')[0] ?? '') || `Этап ${i + 1}`
      const workContent = head?.[3]?.trim() || head?.[2]?.trim() || chunk
      return {
        id: crypto.randomUUID(),
        ordinal: i + 1,
        taskTitle,
        workContent,
        safetyMeasures: '',
      }
    })
  }

  const re = /(3\.\d+(?:\.\d+)?)\s+([^\n]+)/g
  const hits: { index: number; section: string; title: string }[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(opsBlock)) !== null) {
    hits.push({
      index: match.index,
      section: match[1].trim(),
      title: match[2].trim(),
    })
  }
  const tasks = hits.map((hit, i) => {
    const start = hit.index
    const end = i + 1 < hits.length ? hits[i + 1].index : opsBlock.length
    const body = opsBlock
      .slice(start, end)
      .replace(/^[^\n]+\n/, '')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      id: crypto.randomUUID(),
      ordinal: i + 1,
      taskTitle: stripStageNumbering(hit.title),
      workContent: body,
      safetyMeasures: '',
    }
  })
  return tasks.filter((t) => t.taskTitle || t.workContent)
}

/** Извлекает инструменты и оборудование из текста ППР. */
export function extractToolsAndEquipmentFromDoc(docText: string): string {
  const items: string[] = []

  const dedicated = firstMatchBlock(
    docText,
    [
      'Инструменты и оборудование',
      'Tools and Equipment',
      'Equipment and Tools',
      'Plant and Equipment',
    ],
    [
      'Описание технологических операций',
      'DESCRIPTION OF OPERATIONS',
      'Description of Operations',
      'Техника безопасности',
      'HEALTH AND SAFETY',
      'Этапы выполнения',
      'Этапы работ',
      'Участники',
    ],
    { preserveLines: true, minLength: 8 },
  )
  if (dedicated) {
    items.push(...parseToolsAndEquipmentList(dedicated))
  }

  const parenLists = [
    ...docText.matchAll(/(?:применяемое\s+)?оборудовани[ея]\s*\(([^)]+)\)/gi),
    ...docText.matchAll(/(?:tools?|equipment)\s*\(([^)]+)\)/gi),
  ]
  for (const m of parenLists) {
    for (const part of m[1].split(/[,;|]/)) {
      const item = sanitizeToolsAndEquipmentItem(part)
      if (isValidToolsAndEquipmentItem(item)) items.push(item)
    }
  }

  return mergeToolsAndEquipmentSources(items.join('\n'))
}

function summarizeWorkLocation(block: string): string {
  const t = block.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const firstSentence = t.split(/\.\s+/)[0]?.trim() ?? t
  return firstSentence.slice(0, 200)
}

/** Извлекает место проведения работ из текста ППР (свободный текст). */
export function extractWorkLocationFromDoc(docText: string): string {
  const block = firstMatchBlock(
    docText,
    [
      'Место проведения работ',
      'Место выполнения работ',
      'Место работ',
      'Участок',
      'Location',
      'Work location',
      'Work area',
      'Site location',
    ],
    [
      'Описание технологических операций',
      'DESCRIPTION OF OPERATIONS',
      'Инструменты и оборудование',
      'Tools and Equipment',
      'Техника безопасности',
      'HEALTH AND SAFETY',
      'Период',
      'Срок',
    ],
    { preserveLines: false, minLength: 8 },
  )
  if (block.length >= 8) return summarizeWorkLocation(block)

  for (const line of docText.split('\n').slice(0, 80)) {
    const t = line.trim()
    if (!/место|location|участок|площадк/i.test(t)) continue
    const after = t.split(/[:：]/).slice(1).join(':').trim()
    if (after.length >= 5) return summarizeWorkLocation(after)
  }

  const rail = docText.match(
    /(?:железнодорожн(?:ом|ого|ая)\s+(?:тупик|площадк)[^.]{0,120})/i,
  )
  if (rail?.[0]) return summarizeWorkLocation(rail[0])

  return ''
}

/** Rule-based извлечение полей НДПР из текста Method Statement / ППР. */
export function extractNdprByRules(docText: string, workTitle: string): PprNdprExtract {
  const stagesSummaryBlock = firstMatchBlock(
    docText,
    ['Этапы выполнения работ', 'Stages of Work', 'Work Stages'],
    [
      'Описание технологических операций',
      'DESCRIPTION OF OPERATIONS',
      'Description of Operations',
      'Техника безопасности',
      'HEALTH AND SAFETY',
    ],
    { preserveLines: true, minLength: 120 },
  )

  const opsBlock = firstMatchBlock(
    docText,
    [
      'Описание технологических операций',
      'DESCRIPTION OF OPERATIONS',
      'Description of Operations',
      'Sequence of Operations',
    ],
    ['Техника безопасности', 'HEALTH AND SAFETY', 'Health and Safety', 'ПРИЛОЖЕНИЯ', 'APPENDIX'],
    { preserveLines: true },
  )

  let tasks = tasksFromOpsBlock(opsBlock)
  if (tasks.length === 0 && opsBlock.length >= 30) {
    tasks = [
      {
        id: crypto.randomUUID(),
        ordinal: 1,
        taskTitle: workTitle || 'Этап 1',
        workContent: opsBlock.slice(0, 2000),
        safetyMeasures: '',
      },
    ]
  }
  if (tasks.length === 0) tasks = [emptyPprTask(1)]

  let workStages = formatWorkStagesFromTasks(tasks)
  if (!workStages) {
    const titles = extractStageTitlesFromText(opsBlock)
    if (titles.length > 0) workStages = titles.join('\n')
  }
  if (!workStages && stagesSummaryBlock) {
    workStages = formatWorkStagesAsList(stagesSummaryBlock)
  }
  if (!workStages && opsBlock) {
    workStages = formatWorkStagesAsList(opsBlock.slice(0, 4000))
  }

  const workStagesFinal =
    formatWorkStagesFromTasks(tasks) || formatWorkStagesAsList(workStages)
  const toolsAndEquipment = filterToolsAgainstWorkTasks(
    extractToolsAndEquipmentFromDoc(docText),
    [workStagesFinal, ...tasks.map((t) => t.taskTitle), ...tasks.map((t) => t.workContent)],
  )

  return {
    workDescription: '',
    workVolume: '',
    workStages: workStagesFinal,
    toolsAndEquipment,
    tasks,
  }
}

function stagesFromControlMeasures(ppr: PprForm): string {
  const items = ppr.controlMeasures?.items ?? []
  const ops = items.filter((i) => /^3\.|операци/i.test(i.section))
  if (ops.length === 0) return ''
  return formatWorkStagesAsList(
    ops.map((item) => `${item.section} ${item.hazard}`).join('\n'),
  )
}

/** Синхронно дополняет пустые поля НДПР из мер контроля и заголовка. */
export function enrichPprNdprFieldsSync(ppr: PprForm): PprForm {
  const title = normalizePprWorkTitle(
    ppr.workTitle.trim() || ppr.controlMeasures?.workTitle.trim() || '',
  )
  let workStagesText =
    ppr.workStagesText.trim() || formatWorkStagesWithDescriptions(ppr.tasks)
  let tasks = ppr.tasks

  if (!workStagesText) {
    workStagesText = formatWorkStagesFromTasks(tasks)
  }
  if (!workStagesText) {
    workStagesText = stagesFromControlMeasures(ppr)
  }

  let toolsAndEquipment = filterToolsAgainstWorkTasks(ppr.toolsAndEquipment.trim(), [
    workStagesText,
    ...tasks.map((t) => t.taskTitle),
    ...tasks.map((t) => t.workContent),
  ])
  let siteName = ppr.siteName.trim()
  if (!siteName) {
    siteName = matchPtwSiteFromText(buildPprTextHaystack(ppr)) ?? ''
  }
  let contractorOrg = ppr.contractorOrg.trim()
  if (!contractorOrg) {
    contractorOrg = inferContractorOrgFromPpr(ppr)
  }

  return {
    ...ppr,
    workTitle: title || ppr.workTitle,
    siteName,
    contractorOrg,
    workDescription: '',
    workVolume: '',
    workStagesText,
    toolsAndEquipment,
    tasks,
  }
}
