const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const CLAUDE_MODEL_CANDIDATES = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
] as const

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
  opts: { systemPrompt: string; userPrompt: string; json?: boolean },
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
      max_tokens: 16384,
      system,
      messages: [{ role: 'user', content: opts.userPrompt }],
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
    throw new Error(`Claude HTTP ${res.status}: ${errMsg || rawText.slice(0, 200)}`)
  }

  return extractClaudeText(parsed)
}

export async function claudeGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  const models = claudeModelCandidates(process.env.CLAUDE_MODEL?.trim())
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
