/** Модели по убыванию приоритета (gemini-2.0-flash недоступен для новых ключей). */
export const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
] as const

export function geminiModelCandidates(preferred?: string): string[] {
  const p = preferred?.trim()
  if (!p) return [...GEMINI_MODEL_CANDIDATES]
  return [p, ...GEMINI_MODEL_CANDIDATES.filter((m) => m !== p)]
}

export function isGeminiModelNotFoundError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('404') ||
    m.includes('not found') ||
    m.includes('no longer available') ||
    m.includes('is not supported for generatecontent')
  )
}
