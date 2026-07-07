const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const CLAUDE_MODEL_CANDIDATES = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
] as const

const CLAUDE_EXTRACTION_MODEL_CANDIDATES = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
  'claude-sonnet-4-20250514',
] as const

const CLAUDE_COMPLEX_EXTRACTION_MODEL_CANDIDATES = [
  'claude-sonnet-4-6',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
] as const

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'document'
      source: { type: 'base64'; media_type: string; data: string }
    }

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY не настроен в Cloud Functions')
  }
  return key
}

function claudeModelCandidates(preferred?: string): string[] {
  const p = preferred?.trim()
  if (!p) return [...CLAUDE_MODEL_CANDIDATES]
  return [p, ...CLAUDE_MODEL_CANDIDATES.filter((m) => m !== p)]
}

function isClaudeModelNotFoundError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('404') || m.includes('not_found') || m.includes('does not exist')
}

function extractClaudeText(data: unknown): string {
  if (!data || typeof data !== 'object') throw new Error('Claude: пустой ответ')
  const content = (data as { content?: unknown[] }).content
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Claude: пустой ответ')
  }
  const text = content
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const b = block as { type?: string; text?: string }
      return b.type === 'text' ? (b.text ?? '') : ''
    })
    .join('')
    .trim()
  if (!text) throw new Error('Claude: пустой текст')
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
  const system = opts.json
    ? `${opts.systemPrompt}\n\nОтвет — ТОЛЬКО валидный JSON без markdown.`
    : opts.systemPrompt

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey(),
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 16384,
      system,
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
    if (res.status === 401) {
      throw new Error(
        'Claude HTTP 401: недействительный ANTHROPIC_API_KEY — создайте новый ключ в console.anthropic.com, обновите functions/.env и задеплойте functions',
      )
    }
    throw new Error(`Claude HTTP ${res.status}: ${errMsg || rawText.slice(0, 200)}`)
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
  throw lastError ?? new Error('Claude: все модели недоступны')
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
    claudeModelCandidates(process.env.CLAUDE_MODEL?.trim()),
  )
}

export async function claudeGenerateTextForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  const models: string[] = [...CLAUDE_EXTRACTION_MODEL_CANDIDATES]
  const preferred = process.env.CLAUDE_EXTRACTION_MODEL?.trim()
  if (preferred) models.unshift(preferred)
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [{ type: 'text', text: opts.userPrompt }],
      json: true,
      maxTokens: 32768,
    },
    [...new Set(models)],
  )
}

export async function claudeGenerateTextForComplexExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  const models: string[] = [...CLAUDE_COMPLEX_EXTRACTION_MODEL_CANDIDATES]
  const preferred = process.env.CLAUDE_COMPLEX_EXTRACTION_MODEL?.trim()
  if (preferred) models.unshift(preferred)
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [{ type: 'text', text: opts.userPrompt }],
      json: true,
      maxTokens: 64000,
    },
    [...new Set(models)],
  )
}

export async function claudeGenerateWithFileForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
  complex?: boolean
}): Promise<string> {
  const models: string[] = opts.complex
    ? [...CLAUDE_COMPLEX_EXTRACTION_MODEL_CANDIDATES]
    : [...CLAUDE_EXTRACTION_MODEL_CANDIDATES]
  const preferred = process.env.CLAUDE_EXTRACTION_MODEL?.trim()
  if (preferred && !opts.complex) {
    models.unshift(preferred)
  }
  const complexPreferred = process.env.CLAUDE_COMPLEX_EXTRACTION_MODEL?.trim()
  if (complexPreferred && opts.complex) {
    models.unshift(complexPreferred)
  }
  const data = opts.dataBase64.replace(/\s+/g, '')
  return claudeRequestWithFallback(
    {
      systemPrompt: opts.systemPrompt,
      userContent: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: opts.mimeType,
            data,
          },
        },
        { type: 'text', text: opts.userPrompt },
      ],
      json: true,
      maxTokens: 64000,
    },
    [...new Set(models)],
  )
}
