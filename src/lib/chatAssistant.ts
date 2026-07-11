import { ASSISTANT_SYSTEM_PROMPT } from '../config/assistantSystemPrompt'
import { claudeChat, isClaudeConfigured } from './claudeClient'

export type UiChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type ApiChatTurn = UiChatTurn | { role: 'system'; content: string }

function chatUrl(): string | undefined {
  const u = import.meta.env.VITE_AI_CHAT_URL?.trim()
  return u || undefined
}

export function isAssistantChatConfigured(): boolean {
  return isClaudeConfigured() || Boolean(chatUrl())
}

function parseAssistantResponseJson(data: unknown): string | null {
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

/** Чат-ассистент: Claude API или запасной VITE_AI_CHAT_URL. */
export async function requestAssistantCompletion(
  history: UiChatTurn[],
  opts?: { idToken?: string | null; systemPrompt?: string },
): Promise<string> {
  const systemPrompt = opts?.systemPrompt?.trim() || ASSISTANT_SYSTEM_PROMPT

  if (isClaudeConfigured()) {
    return claudeChat({ systemPrompt, history })
  }

  const url = chatUrl()
  if (!url) {
    throw new Error('assistant_not_configured')
  }

  const messages: ApiChatTurn[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((t) =>
      t.role === 'assistant'
        ? { role: 'assistant' as const, content: t.content }
        : { role: 'user' as const, content: t.content },
    ),
  ]

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const token = opts?.idToken?.trim()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
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

  const content = parseAssistantResponseJson(parsed ?? {})
  if (content) return content

  if (typeof rawText === 'string' && rawText.trim()) return rawText.trim()

  throw new Error('assistant_empty_response')
}
