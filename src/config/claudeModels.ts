export const CLAUDE_MODEL_CANDIDATES = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
] as const

export const CLAUDE_EXTRACTION_MODEL_CANDIDATES = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
  'claude-sonnet-4-20250514',
] as const

export const CLAUDE_COMPLEX_EXTRACTION_MODEL_CANDIDATES = [
  'claude-sonnet-4-6',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
] as const

export function claudeModelCandidates(preferred?: string): string[] {
  const p = preferred?.trim()
  if (!p) return [...CLAUDE_MODEL_CANDIDATES]
  return [p, ...CLAUDE_MODEL_CANDIDATES.filter((m) => m !== p)]
}

export function claudeExtractionModelCandidates(): string[] {
  const preferred = import.meta.env.VITE_CLAUDE_EXTRACTION_MODEL?.trim()
  if (!preferred) return [...CLAUDE_EXTRACTION_MODEL_CANDIDATES]
  return [
    preferred,
    ...CLAUDE_EXTRACTION_MODEL_CANDIDATES.filter((m) => m !== preferred),
  ]
}

export function claudeComplexExtractionModelCandidates(): string[] {
  const preferred = import.meta.env.VITE_CLAUDE_COMPLEX_EXTRACTION_MODEL?.trim()
  if (!preferred) return [...CLAUDE_COMPLEX_EXTRACTION_MODEL_CANDIDATES]
  return [
    preferred,
    ...CLAUDE_COMPLEX_EXTRACTION_MODEL_CANDIDATES.filter((m) => m !== preferred),
  ]
}

export function isClaudeModelNotFoundError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('404') ||
    m.includes('not_found') ||
    m.includes('model:') ||
    m.includes('does not exist')
  )
}
