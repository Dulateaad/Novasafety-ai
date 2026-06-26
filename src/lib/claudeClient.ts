import {
  claudeComplexExtractionModelCandidates,
  claudeExtractionModelCandidates,
  claudeModelCandidates,
  isClaudeModelNotFoundError,
} from '../config/claudeModels'
import type { UiChatTurn } from './chatAssistant'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

function apiKey(): string | undefined {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim()
  return key || undefined
}

function preferredModel(): string | undefined {
  return import.meta.env.VITE_CLAUDE_MODEL?.trim() || undefined
}

export function isClaudeConfigured(): boolean {
  return Boolean(apiKey())
}

function jsonSystemSuffix(systemPrompt: string): string {
  return `${systemPrompt}\n\nОтвет — ТОЛЬКО валидный JSON без markdown-обёртки и без пояснений.`
}

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'document'
      source: { type: 'base64'; media_type: string; data: string }
    }

function extractClaudeText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('claude_empty_response')
  }
  const content = (data as { content?: unknown[] }).content
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('claude_empty_response')
  }
  const text = content
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const b = block as { type?: string; text?: string }
      return b.type === 'text' ? (b.text ?? '') : ''
    })
    .join('')
    .trim()
  if (!text) throw new Error('claude_empty_response')
  return text
}

async function claudeRequest(
  model: string,
  opts: {
    systemPrompt: string
    userContent: ClaudeContentBlock[]
    json?: boolean
    maxTokens?: number
  },
): Promise<string> {
  const key = apiKey()
  if (!key) throw new Error('claude_not_configured')

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 16384,
      system: opts.json ? jsonSystemSuffix(opts.systemPrompt) : opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userContent }],
      temperature: opts.json ? 0.1 : 0.4,
    }),
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
    throw new Error(`claude_http_${res.status}:${errMsg || rawText.slice(0, 200)}`)
  }

  return extractClaudeText(parsed)
}

async function claudeRequestWithFallback(
  opts: {
    systemPrompt: string
    userContent: ClaudeContentBlock[]
    json?: boolean
    maxTokens?: number
  },
  models: string[],
): Promise<string> {
  let lastError: Error | null = null
  for (const model of models) {
    try {
      return await claudeRequest(model, opts)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      lastError = err
      if (!isClaudeModelNotFoundError(err.message)) throw err
    }
  }
  throw lastError ?? new Error('claude_all_models_failed')
}

export async function claudeGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [{ type: 'text', text: opts.userPrompt }],
      json: opts.json,
    },
    claudeModelCandidates(preferredModel()),
  )
}

export async function claudeGenerateTextForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [{ type: 'text', text: opts.userPrompt }],
      json: true,
      maxTokens: 32768,
    },
    claudeExtractionModelCandidates(),
  )
}

export async function claudeGenerateWithFileForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: opts.mimeType,
            data: opts.dataBase64,
          },
        },
        { type: 'text', text: opts.userPrompt },
      ],
      json: true,
      maxTokens: 64000,
    },
    claudeExtractionModelCandidates(),
  )
}


export async function claudeGenerateTextForComplexExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [{ type: 'text', text: opts.userPrompt }],
      json: true,
      maxTokens: 64000,
    },
    claudeComplexExtractionModelCandidates(),
  )
}

export async function claudeGenerateWithFileForComplexExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: opts.mimeType,
            data: opts.dataBase64,
          },
        },
        { type: 'text', text: opts.userPrompt },
      ],
      json: true,
      maxTokens: 64000,
    },
    claudeComplexExtractionModelCandidates(),
  )
}

export async function claudeChat(opts: {
  systemPrompt: string
  history: UiChatTurn[]
}): Promise<string> {
  const transcript = opts.history
    .map((turn) => `${turn.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${turn.content}`)
    .join('\n\n')
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [{ type: 'text', text: transcript }],
    },
    claudeModelCandidates(preferredModel()),
  )
}
