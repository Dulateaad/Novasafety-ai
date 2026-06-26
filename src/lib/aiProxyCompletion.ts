/**
 * Общие POST на VITE_AI_CHAT_URL (общий формат сообщений как у Чат ИИ).
 */
export type AiApiTurn =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }

function aiUrl(): string | undefined {
  const u = import.meta.env.VITE_AI_CHAT_URL?.trim()
  return u || undefined
}

export function isAiProxyConfigured(): boolean {
  return Boolean(aiUrl())
}

function parseContentFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (typeof o.reply === 'string') return o.reply.trim() || null
  if (typeof o.content === 'string') return o.content.trim() || null
  if (typeof o.message === 'string') return o.message.trim() || null
  const choices = o.choices
  if (!Array.isArray(choices)) return null
  const first = choices[0] as Record<string, unknown> | undefined
  const msg =
    first?.message && typeof first.message === 'object'
      ? (first.message as Record<string, unknown>)
      : undefined
  if (typeof msg?.content === 'string') return msg.content.trim() || null
  return null
}

export async function requestAiCompletion(
  messages: AiApiTurn[],
  opts?: { idToken?: string | null },
): Promise<string> {
  const url = aiUrl()
  if (!url) {
    throw new Error('assistant_not_configured')
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const token = opts?.idToken?.trim()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      intent: 'ppr_generation',
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
    const msg =
      (parsed &&
        typeof parsed === 'object' &&
        typeof (parsed as Record<string, unknown>).error === 'string' &&
        (parsed as Record<string, unknown>).error) ||
      rawText.slice(0, 220) ||
      res.statusText
    throw new Error(`assistant_http_${res.status}:${String(msg)}`)
  }

  const content = parseContentFromResponse(parsed ?? {})
  if (content) return content

  if (typeof rawText === 'string' && rawText.trim()) return rawText.trim()

  throw new Error('assistant_empty_response')
}
