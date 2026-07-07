import {
  buildControlMeasuresPdfRetryPrompt,
  buildControlMeasuresPdfUserPrompt,
  PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
} from '../config/pprControlMeasuresPrompt'
import type { PprAttachment } from '../types/ppr'
import {
  aiGenerateWithFileForComplexExtraction,
  aiGenerateWithFileForExtraction,
  isAiAccessDeniedError,
  isAiClientReady,
} from './aiClient'
import { claudeServerAi, isClaudeServerAvailable } from './claudeServerAi'
import type { GeminiExtractResult } from './pprGeminiExtract'
import { isLikelyFileNameTitle, normalizePprWorkTitle } from './narjadTitle'
import { normalizeNdprFromPayload } from './pprNdprExtract'
import {
  minimalControlMeasuresFallback,
  normalizeControlMeasuresItems,
  normalizePdfDocumentFromPayload,
  parseControlMeasuresJson,
} from './pprControlMeasuresParse'
import { guessMimeType } from './pprAttachment'

function attachmentMime(att: PprAttachment): string {
  if (att.mimeType?.trim()) return att.mimeType.trim()
  return guessMimeType(att.fileName, '')
}

function sanitizeBase64(data: string): string {
  return data.replace(/\s+/g, '')
}

export function isPdfAttachment(att: PprAttachment): boolean {
  const ext = att.fileName.split('.').pop()?.toLowerCase() ?? ''
  const mime = attachmentMime(att)
  return ext === 'pdf' || mime === 'application/pdf'
}

export function isPprPdfAiReady(): boolean {
  return isClaudeServerAvailable() || isAiClientReady()
}

function buildResultFromPayload(
  payload: ReturnType<typeof parseControlMeasuresJson>,
  opts?: { allowMinimalFallback?: boolean },
): GeminiExtractResult {
  const workTitle = normalizePprWorkTitle(String(payload.workTitle ?? ''))
  const ndprExtract = normalizeNdprFromPayload(payload)
  let items = normalizeControlMeasuresItems(payload, { workTitle })

  if (items.length === 0 && ndprExtract.workStages.trim()) {
    items = normalizeControlMeasuresItems(
      {
        ...payload,
        items: [
          {
            section: 'Этапы работ',
            hazard: 'Операционные риски',
            controlMeasures: ndprExtract.workStages
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.length > 8)
              .slice(0, 12),
          },
        ],
      },
      { workTitle },
    )
  }

  if (items.length === 0 && opts?.allowMinimalFallback) {
    items = minimalControlMeasuresFallback(workTitle)
  }

  return {
    workTitle,
    items,
    geminiPdfDocument: normalizePdfDocumentFromPayload(payload),
    ndprExtract,
  }
}

function isUsefulPprExtraction(result: GeminiExtractResult, fileName: string): boolean {
  if (result.items.length >= 2) return true
  const ex = result.ndprExtract
  if (!ex) return false
  const richTasks = ex.tasks.filter(
    (t) => t.taskTitle.trim().length > 5 && t.workContent.trim().length > 15,
  )
  if (richTasks.length >= 2) return true
  if (ex.workStages.trim().length > 80) return true
  if ((ex.toolsAndEquipment?.trim().length ?? 0) > 25) return true
  if (
    ex.siteName?.trim() &&
    result.workTitle.trim() &&
    !isLikelyFileNameTitle(result.workTitle, fileName)
  ) {
    return true
  }
  return false
}

function ensureControlMeasureItems(result: GeminiExtractResult): GeminiExtractResult {
  if (result.items.length > 0) return result
  const fallback = buildResultFromPayload(
    { workTitle: result.workTitle },
    { allowMinimalFallback: true },
  )
  return { ...result, items: fallback.items }
}

async function requestPdfExtraction(
  attachment: PprAttachment,
  userPrompt: string,
  useComplexModel: boolean,
): Promise<string> {
  const dataBase64 = sanitizeBase64(attachment.dataBase64)
  const systemPrompt = PPR_CONTROL_MEASURES_SYSTEM_PROMPT

  if (isClaudeServerAvailable()) {
    return claudeServerAi({
      systemPrompt,
      userPrompt,
      mimeType: 'application/pdf',
      dataBase64,
      complex: useComplexModel,
    })
  }

  if (!isAiClientReady()) {
    throw new Error(
      'Claude недоступен: настройте ANTHROPIC_API_KEY в Cloud Functions (functions/.env) и задеплойте functions.',
    )
  }

  const opts = {
    systemPrompt,
    userPrompt,
    mimeType: 'application/pdf',
    dataBase64,
  }
  if (useComplexModel) {
    return aiGenerateWithFileForComplexExtraction(opts)
  }
  return aiGenerateWithFileForExtraction(opts)
}

/** Claude читает PDF ППР (только сервер в prod; браузер — локальная разработка). */
export async function extractControlMeasuresFromPdfWithGemini(
  attachment: PprAttachment,
): Promise<GeminiExtractResult> {
  if (!isPprPdfAiReady()) {
    throw new Error(
      'Для PDF нужен Claude на сервере (deploy functions + ANTHROPIC_API_KEY в functions/.env).',
    )
  }

  const attempts: Array<{ prompt: string; complex: boolean }> = [
    { prompt: buildControlMeasuresPdfUserPrompt(attachment.fileName), complex: true },
    { prompt: buildControlMeasuresPdfUserPrompt(attachment.fileName), complex: false },
    { prompt: buildControlMeasuresPdfRetryPrompt(attachment.fileName), complex: true },
  ]

  let lastResult: GeminiExtractResult | null = null
  let lastError: string | null = null

  for (const attempt of attempts) {
    try {
      const raw = await requestPdfExtraction(
        attachment,
        attempt.prompt,
        attempt.complex,
      )
      const result = buildResultFromPayload(parseControlMeasuresJson(raw))
      lastResult = result
      if (isUsefulPprExtraction(result, attachment.fileName)) {
        return ensureControlMeasureItems(result)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      lastError = msg
      if (isAiAccessDeniedError(msg) && isClaudeServerAvailable()) {
        break
      }
    }
  }

  if (lastResult && isUsefulPprExtraction(lastResult, attachment.fileName)) {
    return ensureControlMeasureItems(lastResult)
  }

  if (isClaudeServerAvailable() && lastError) {
    throw new Error(
      `Claude на сервере не смог прочитать PDF. Проверьте ANTHROPIC_API_KEY в functions/.env и выполните deploy functions. Детали: ${lastError}`,
    )
  }

  const detail = lastError ? ` (${lastError})` : ''
  throw new Error(`Claude не извлёк данные из PDF ППР${detail}`)
}
