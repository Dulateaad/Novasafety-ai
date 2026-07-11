import { geminiModelCandidates, isGeminiModelNotFoundError } from '../config/geminiModels'
import type { UiChatTurn } from './chatAssistant'
import {
  isGeminiAccessDenied,
  markGeminiAccessDenied,
} from './geminiAccessCache'

const DEFAULT_MODEL = 'gemini-2.0-flash'

function apiKey(): string | undefined {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  return key || undefined
}

function preferredModel(): string {
  return import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_MODEL
}

export function isGeminiConfigured(): boolean {
  return Boolean(apiKey())
}

/** Клиентский Gemini доступен (ключ есть и нет 403 в этой сессии). */
export function isGeminiClientReady(): boolean {
  return isGeminiConfigured() && !isGeminiAccessDenied()
}

export function isGeminiAccessDeniedError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('gemini_http_403') || m.includes('denied access')
}

function extractGeminiText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('gemini_empty_response')
  }
  const candidates = (data as { candidates?: unknown[] }).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const block = (data as { promptFeedback?: { blockReason?: string } }).promptFeedback
    if (block?.blockReason) {
      throw new Error(`Gemini: ${block.blockReason}`)
    }
    throw new Error('gemini_empty_response')
  }
  const parts = (
    candidates[0] as { content?: { parts?: { text?: string }[] } }
  ).content?.parts
  const text = parts?.map((p) => p.text ?? '').join('').trim()
  if (!text) throw new Error('gemini_empty_response')
  return text
}

async function geminiRequest(
  model: string,
  body: Record<string, unknown>,
): Promise<string> {
  const key = apiKey()
  if (!key) throw new Error('gemini_not_configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const rawText = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText) as unknown
  } catch {
    parsed = null
  }

  if (!res.ok) {
    const errMsg =
      parsed &&
      typeof parsed === 'object' &&
      (parsed as { error?: { message?: string } }).error?.message
    if (res.status === 403) markGeminiAccessDenied()
    throw new Error(`gemini_http_${res.status}:${errMsg || rawText.slice(0, 200)}`)
  }

  return extractGeminiText(parsed)
}

async function geminiRequestWithFallback(
  body: Record<string, unknown>,
): Promise<string> {
  const models = geminiModelCandidates(preferredModel())
  let lastError: Error | null = null

  for (const model of models) {
    try {
      return await geminiRequest(model, body)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      lastError = err
      if (!isGeminiModelNotFoundError(err.message)) throw err
    }
  }

  throw lastError ?? new Error('gemini_all_models_failed')
}

/** Запрос к Google Gemini API (Generative Language API). */
export async function geminiGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  return geminiRequestWithFallback({
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
    generationConfig: opts.json
      ? { responseMimeType: 'application/json', temperature: 0.2 }
      : { temperature: 0.4 },
  })
}

/** JSON-ответ для извлечения структуры из документов. */
export async function geminiGenerateTextForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  return geminiRequestWithFallback({
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  })
}

/** Запрос с файлом (PDF, docx) — multimodal Gemini. */
export async function geminiGenerateWithFile(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
  json?: boolean
}): Promise<string> {
  return geminiRequestWithFallback({
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: opts.mimeType, data: opts.dataBase64 } },
          { text: opts.userPrompt },
        ],
      },
    ],
    generationConfig: opts.json
      ? { responseMimeType: 'application/json', temperature: 0.2 }
      : { temperature: 0.4 },
  })
}

/** Multimodal JSON-извлечение из файла. */
export async function geminiGenerateWithFileForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  return geminiGenerateWithFile({ ...opts, json: true })
}

/** Диалог с Gemini (история user/assistant). */
export async function geminiChat(opts: {
  systemPrompt: string
  history: UiChatTurn[]
}): Promise<string> {
  const contents = opts.history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }))

  return geminiRequestWithFallback({
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.4 },
  })
}
