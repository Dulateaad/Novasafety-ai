import { PPR_CONTROL_MEASURES_SYSTEM_PROMPT } from '../config/pprControlMeasuresPrompt'
import type { PprAttachment } from '../types/ppr'
import {
  activeAiProviderLabel,
  aiGenerateWithFileForComplexExtraction,
  isAiClientReady,
} from './aiClient'
import type { GeminiExtractResult } from './pprGeminiExtract'
import { normalizeNdprFromPayload } from './pprNdprExtract'
import {
  normalizeControlMeasuresItems,
  normalizePdfDocumentFromPayload,
  parseControlMeasuresJson,
} from './pprControlMeasuresParse'
import { guessMimeType } from './pprAttachment'
import { normalizePprWorkTitle } from './narjadTitle'

function attachmentMime(att: PprAttachment): string {
  if (att.mimeType?.trim()) return att.mimeType.trim()
  return guessMimeType(att.fileName, '')
}

export function isPdfAttachment(att: PprAttachment): boolean {
  const ext = att.fileName.split('.').pop()?.toLowerCase() ?? ''
  const mime = attachmentMime(att)
  return ext === 'pdf' || mime === 'application/pdf'
}

/** Gemini читает PDF ППР и возвращает items + pdfDocument. */
export async function extractControlMeasuresFromPdfWithGemini(
  attachment: PprAttachment,
): Promise<GeminiExtractResult> {
  if (!isAiClientReady()) {
    throw new Error(
      `Для PDF нужен ключ ${activeAiProviderLabel()} (VITE_ANTHROPIC_API_KEY). Загрузите .docx или настройте API.`,
    )
  }

  const userPrompt = `Файл: ${attachment.fileName}

Документ ППР приложен как PDF. Извлеки workTitle, workTasks, toolsAndEquipment и items (меры контроля) в JSON по схеме из системного промпта. pdfDocument оставь null.`

  const raw = await aiGenerateWithFileForComplexExtraction({
    systemPrompt: PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
    userPrompt,
    mimeType: 'application/pdf',
    dataBase64: attachment.dataBase64,
  })

  const payload = parseControlMeasuresJson(raw)
  const items = normalizeControlMeasuresItems(payload)
  if (items.length === 0) {
    throw new Error('ИИ не извлёк меры контроля из PDF')
  }

  return {
    workTitle: normalizePprWorkTitle(String(payload.workTitle ?? '')),
    items,
    geminiPdfDocument: normalizePdfDocumentFromPayload(payload),
    ndprExtract: normalizeNdprFromPayload(payload),
  }
}
