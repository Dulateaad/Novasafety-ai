import type { PprControlMeasuresItem } from '../types/ppr'
import type { PprForm } from '../types/ppr'
import { effectivePprWorkTitle } from './narjadTitle'
import { extractControlMeasuresByRules } from './pprControlMeasuresRules'
import { extractTextFromPprAttachment } from './pprDocText'
import { formatWorkStagesWithDescriptions } from './pprNdprExtract'
import { prioritizeRiskAssessmentText } from './pprTextPrioritize'

/** Умное сжатие ППР для NEBOSH/АБР — фокус на 3.x и ТБ, без потери смысла. */
export const PPR_RISK_DOC_EXCERPT_MAX = 28000

export type PprRiskAssessmentContext = {
  workTitle: string
  workDescription: string
  workStages: string
  workVolume: string
  toolsAndEquipment: string
  safetyMeasures: string
  controlMeasuresMarkdown: string
  controlMeasuresStructured: string
  docTextExcerpt: string
  operationGroupsHint: string[]
  siteName: string
  contractorOrg: string
}

const contextCache = new Map<string, Promise<PprRiskAssessmentContext>>()

function pprContextCacheKey(ppr: PprForm): string {
  const att = ppr.attachment
  const attSig = att
    ? `${att.fileName}|${att.dataBase64.length}|${att.dataBase64.slice(0, 48)}`
    : ''
  return [
    ppr.workTitle,
    ppr.workStagesText,
    ppr.toolsAndEquipment,
    ppr.controlMeasures?.generatedAtIso ?? '',
    String(ppr.controlMeasures?.items?.length ?? 0),
    attSig,
  ].join('\0')
}

function operationalHaystack(text: string): string {
  if (text.length <= 5500) return text
  return text.slice(5500)
}

/** Этапы 3.x из текста ППР (тело документа, без оглавления). */
export function inferOperationGroupsFromText(text: string): string[] {
  if (!text.trim()) return []

  const hay = operationalHaystack(text)
  const groups: string[] = []
  const seen = new Set<string>()

  for (const m of hay.matchAll(
    /(?:^|\n)\s*(3\.\d+(?:\.\d+)?)\s+([^\n]+?)(?:\s+\d{1,3})?\s*(?:\n|$)/g,
  )) {
    const title = m[2].replace(/\s+/g, ' ').trim()
    if (title.length < 12) continue
    if (/^описание технолог/i.test(title)) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    groups.push(`${m[1]} ${title}`)
  }

  if (groups.length) return groups.slice(0, 8)

  for (const line of hay.split('\n')) {
    const t = line.trim()
    if (!/^\d+\.\d+/.test(t) || t.length < 20) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    groups.push(t)
    if (groups.length >= 8) break
  }

  return groups
}

export function formatControlMeasuresForRisk(items?: PprControlMeasuresItem[]): string {
  if (!items?.length) return ''
  return items
    .map((item) => {
      const measures = item.controlMeasures.map((m) => `- ${m}`).join('\n')
      return `### ${item.section}\nТема: ${item.hazard}\n${measures}`
    })
    .join('\n\n')
}

async function buildPprRiskAssessmentContextInner(
  ppr: PprForm,
): Promise<PprRiskAssessmentContext> {
  let docText = ''
  if (ppr.attachment?.dataBase64) {
    try {
      docText = await extractTextFromPprAttachment(ppr.attachment)
    } catch {
      /* markdown / structured fallback */
    }
  }

  const workStages =
    ppr.workStagesText.trim() || formatWorkStagesWithDescriptions(ppr.tasks)

  let structured = formatControlMeasuresForRisk(ppr.controlMeasures?.items)
  if (!structured && docText) {
    structured = formatControlMeasuresForRisk(
      extractControlMeasuresByRules(docText, ppr.workTitle),
    )
  }

  const markdown = ppr.controlMeasures?.markdown ?? ''
  const docExcerpt = docText
    ? prioritizeRiskAssessmentText(docText, PPR_RISK_DOC_EXCERPT_MAX)
    : ''
  const operationGroupsHint = inferOperationGroupsFromText(docText || workStages)

  return {
    workTitle: effectivePprWorkTitle(ppr),
    workDescription: ppr.workDescription,
    workStages,
    workVolume: ppr.workVolume,
    toolsAndEquipment: ppr.toolsAndEquipment,
    safetyMeasures: ppr.safetyMeasures,
    controlMeasuresMarkdown: markdown,
    controlMeasuresStructured: structured,
    docTextExcerpt: docExcerpt,
    operationGroupsHint,
    siteName: ppr.siteName,
    contractorOrg: ppr.contractorOrg,
  }
}

/** Контекст ППР для NEBOSH / АБР / разрешений (кэш на время сессии). */
export async function buildPprRiskAssessmentContext(
  ppr: PprForm,
): Promise<PprRiskAssessmentContext> {
  const key = pprContextCacheKey(ppr)
  let pending = contextCache.get(key)
  if (!pending) {
    pending = buildPprRiskAssessmentContextInner(ppr)
    contextCache.set(key, pending)
    pending.catch(() => contextCache.delete(key))
  }
  return pending
}

export function clearPprRiskAssessmentContextCache(): void {
  contextCache.clear()
}
