import {
  buildControlMeasuresUserPrompt,
  PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
} from '../config/pprControlMeasuresPrompt'
import type { GeminiPdfDocument, PprControlMeasuresItem } from '../types/ppr'
import { aiGenerateTextForExtraction, isAiClientReady } from './aiClient'
import {
  normalizeControlMeasuresItems,
  normalizePdfDocumentFromPayload,
  parseControlMeasuresJson,
} from './pprControlMeasuresParse'
import type { PprNdprExtract } from './pprNdprExtract'
import { normalizeNdprFromPayload } from './pprNdprExtract'

export type GeminiExtractResult = {
  workTitle: string
  items: PprControlMeasuresItem[]
  geminiPdfDocument?: GeminiPdfDocument
  ndprExtract?: PprNdprExtract
}

async function extractWithAiClient(
  docText: string,
  fileName: string,
): Promise<GeminiExtractResult> {
  const raw = await aiGenerateTextForExtraction({
    systemPrompt: PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
    userPrompt: buildControlMeasuresUserPrompt(docText, fileName),
  })
  const payload = parseControlMeasuresJson(raw)
  const items = normalizeControlMeasuresItems(payload)
  if (items.length === 0) {
    throw new Error('ИИ не извлёк меры контроля из документа')
  }
  return {
    workTitle: String(payload.workTitle ?? '').trim(),
    items,
    geminiPdfDocument: normalizePdfDocumentFromPayload(payload),
    ndprExtract: normalizeNdprFromPayload(payload),
  }
}

/** Claude анализирует текст .docx ППР. */
export async function tryExtractWithGemini(
  docText: string,
  fileName: string,
): Promise<GeminiExtractResult | null> {
  if (!isAiClientReady()) return null
  try {
    return await extractWithAiClient(docText, fileName)
  } catch {
    return null
  }
}

export function isGeminiExtractionAvailable(): boolean {
  return isAiClientReady()
}
