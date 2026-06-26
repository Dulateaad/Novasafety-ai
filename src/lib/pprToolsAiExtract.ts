import {
  buildToolsExtractionUserPrompt,
  PPR_TOOLS_EXTRACTION_SYSTEM_PROMPT,
} from '../config/pprToolsExtractionPrompt'
import type { PprAttachment } from '../types/ppr'
import {
  aiGenerateTextForExtraction,
  aiGenerateWithFileForExtraction,
  isAiClientReady,
} from './aiClient'
import { isPdfAttachment } from './pprGeminiPdfExtract'
import { parseControlMeasuresJson } from './pprControlMeasuresParse'
import {
  filterToolsAgainstWorkTasks,
  mergeToolsAndEquipmentSources,
  normalizeToolsAndEquipmentText,
  parseToolsAndEquipmentList,
  sanitizeToolsAndEquipmentItem,
} from './toolsAndEquipmentFormat'
import { extractToolsAndEquipmentFromDoc } from './pprNdprRules'

function nameFromEntry(entry: unknown): string {
  if (!entry || typeof entry !== 'object') {
    return typeof entry === 'string' ? entry.trim() : ''
  }
  const o = entry as Record<string, unknown>
  const tag = typeof o.tag === 'string' ? o.tag.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const designation = typeof o.designation === 'string' ? o.designation.trim() : ''
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const наименование =
    typeof o.наименование === 'string' ? o.наименование.trim() : ''
  return sanitizeToolsAndEquipmentItem(
    tag || name || designation || title || наименование,
  )
}

function collectNamesFromPayload(value: unknown, out: string[]): void {
  if (!value) return
  if (typeof value === 'string') {
    const t = sanitizeToolsAndEquipmentItem(value)
    if (t) out.push(t)
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') {
        collectNamesFromPayload(entry, out)
      } else if (entry && typeof entry === 'object') {
        const name = nameFromEntry(entry)
        if (name) out.push(name)
        else collectNamesFromPayload(entry, out)
      }
    }
    return
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (Array.isArray(o.categories)) {
      for (const cat of o.categories) {
        if (!cat || typeof cat !== 'object') continue
        const items = (cat as { items?: unknown }).items
        collectNamesFromPayload(items, out)
      }
      return
    }
    if (Array.isArray(o.items)) {
      collectNamesFromPayload(o.items, out)
      return
    }
    for (const v of Object.values(o)) {
      if (typeof v === 'string' || Array.isArray(v)) collectNamesFromPayload(v, out)
    }
  }
}

function itemsFromToolsPayload(raw: string): string[] {
  try {
    const payload = parseControlMeasuresJson(raw) as Record<string, unknown>
    const out: string[] = []
    collectNamesFromPayload(payload, out)
    if (out.length) return out
    if (typeof payload.toolsAndEquipment === 'string') {
      return parseToolsAndEquipmentList(payload.toolsAndEquipment)
    }
  } catch {
    /* fallback below */
  }
  return parseToolsAndEquipmentList(raw)
}

/** Языковой анализ текста ППР — извлечение инструментов и оборудования через Claude/Gemini. */
export async function extractToolsAndEquipmentWithAi(
  docText: string,
  fileName: string,
): Promise<string> {
  if (!isAiClientReady() || !docText.trim()) return ''

  const raw = await aiGenerateTextForExtraction({
    systemPrompt: PPR_TOOLS_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: buildToolsExtractionUserPrompt(docText, fileName),
  })
  const items = itemsFromToolsPayload(raw)
  return normalizeToolsAndEquipmentText(items.join('\n'))
}

/** Языковой анализ PDF ППР — только список инструментов и оборудования. */
export async function extractToolsAndEquipmentFromPdfWithAi(
  attachment: PprAttachment,
): Promise<string> {
  if (!isAiClientReady() || !isPdfAttachment(attachment)) return ''

  const raw = await aiGenerateWithFileForExtraction({
    systemPrompt: PPR_TOOLS_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: `Файл: ${attachment.fileName}

Проанализируй документ ППР (PDF) и верни JSON categories по правилам из системного промпта.`,
    mimeType: 'application/pdf',
    dataBase64: attachment.dataBase64,
  })
  const items = itemsFromToolsPayload(raw)
  return normalizeToolsAndEquipmentText(items.join('\n'))
}

export async function resolveToolsAndEquipmentFromPpr(opts: {
  docText?: string
  fileName: string
  attachment?: PprAttachment
  markdownFallback?: string
  extractTools?: string
  workTexts: Array<string | undefined | null>
}): Promise<string> {
  const textForRules =
    opts.docText?.trim() || opts.markdownFallback?.trim() || ''
  let aiTools = ''

  if (textForRules && isAiClientReady()) {
    try {
      aiTools = await extractToolsAndEquipmentWithAi(textForRules, opts.fileName)
    } catch {
      /* rules fallback */
    }
  }

  if (!aiTools.trim() && opts.attachment && isPdfAttachment(opts.attachment) && isAiClientReady()) {
    try {
      aiTools = await extractToolsAndEquipmentFromPdfWithAi(opts.attachment)
    } catch {
      /* rules fallback */
    }
  }

  const fromRules = textForRules ? extractToolsAndEquipmentFromDoc(textForRules) : ''
  const aiList = parseToolsAndEquipmentList(aiTools)
  const rulesList = parseToolsAndEquipmentList(fromRules)
  const merged =
    aiList.length >= rulesList.length
      ? mergeToolsAndEquipmentSources(aiTools, fromRules, opts.extractTools)
      : mergeToolsAndEquipmentSources(fromRules, aiTools, opts.extractTools)

  return filterToolsAgainstWorkTasks(merged, opts.workTexts)
}
