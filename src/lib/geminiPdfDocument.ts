import {
  buildPdfDocumentUserPrompt,
  PPR_PDF_DOCUMENT_SYSTEM_PROMPT,
} from '../config/pprControlMeasuresPdfPrompt'
import type { GeminiPdfDocument, PprControlMeasuresItem } from '../types/ppr'
import { aiGenerateTextForExtraction, isAiClientReady } from './aiClient'
import { parseGeminiPdfDocumentJson } from './pprControlMeasuresParse'

async function generatePdfDocumentWithGeminiClient(input: {
  workTitle: string
  sourceFileName: string
  items: PprControlMeasuresItem[]
}): Promise<GeminiPdfDocument> {
  const raw = await aiGenerateTextForExtraction({
    systemPrompt: PPR_PDF_DOCUMENT_SYSTEM_PROMPT,
    userPrompt: buildPdfDocumentUserPrompt(input),
  })
  const doc = parseGeminiPdfDocumentJson(raw)
  if (!doc.blocks.length) {
    throw new Error('ИИ не сформировал PDF-документ')
  }
  return doc
}

/** PDF-документ мер контроля через Claude в браузере. */
export async function generatePdfDocumentWithGemini(input: {
  workTitle: string
  sourceFileName: string
  items: PprControlMeasuresItem[]
}): Promise<GeminiPdfDocument> {
  if (!isAiClientReady()) {
    throw new Error('claude_not_configured')
  }
  return generatePdfDocumentWithGeminiClient(input)
}
