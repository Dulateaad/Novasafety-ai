const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
] as const

function geminiModelCandidates(preferred?: string): string[] {
  const p = preferred?.trim()
  if (!p) return [...GEMINI_MODEL_CANDIDATES]
  return [p, ...GEMINI_MODEL_CANDIDATES.filter((m) => m !== p)]
}

function isGeminiModelNotFoundError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('404') ||
    m.includes('not found') ||
    m.includes('no longer available') ||
    m.includes('is not supported for generatecontent')
  )
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    throw new Error('GEMINI_API_KEY не настроен в Cloud Functions')
  }
  return key
}

function extractGeminiText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Gemini: пустой ответ')
  }
  const candidates = (data as { candidates?: unknown[] }).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('Gemini: пустой ответ')
  }
  const parts = (
    candidates[0] as { content?: { parts?: { text?: string }[] } }
  ).content?.parts
  const text = parts?.map((p) => p.text ?? '').join('').trim()
  if (!text) throw new Error('Gemini: пустой текст')
  return text
}

async function geminiRequest(
  model: string,
  body: Record<string, unknown>,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey())}`

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
    throw new Error(`Gemini HTTP ${res.status}: ${errMsg || rawText.slice(0, 200)}`)
  }

  return extractGeminiText(parsed)
}

export async function geminiGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  const models = geminiModelCandidates(process.env.GEMINI_MODEL?.trim())
  let lastError: Error | null = null

  const body = {
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
    generationConfig: opts.json
      ? { responseMimeType: 'application/json', temperature: 0.2 }
      : { temperature: 0.4 },
  }

  for (const model of models) {
    try {
      return await geminiRequest(model, body)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      lastError = err
      if (!isGeminiModelNotFoundError(err.message)) throw err
    }
  }

  throw lastError ?? new Error('Gemini: все модели недоступны')
}
