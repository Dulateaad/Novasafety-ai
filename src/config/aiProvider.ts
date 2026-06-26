export type AiProvider = 'claude' | 'gemini' | 'auto'

/** Какой ИИ использовать в браузере (VITE_AI_PROVIDER или auto по ключам). */
export function resolveAiProvider(): AiProvider {
  const raw = import.meta.env.VITE_AI_PROVIDER?.trim().toLowerCase()
  if (raw === 'claude' || raw === 'gemini') return raw
  if (import.meta.env.VITE_ANTHROPIC_API_KEY?.trim()) return 'claude'
  if (import.meta.env.VITE_GEMINI_API_KEY?.trim()) return 'gemini'
  return 'claude'
}

export function aiProviderLabel(provider: AiProvider): string {
  return provider === 'claude' ? 'Claude' : 'Gemini'
}
