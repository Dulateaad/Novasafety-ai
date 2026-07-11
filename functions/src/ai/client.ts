import { claudeGenerateText } from '../claude/client'
import { geminiGenerateText } from '../gemini/client'

function resolveProvider(): 'claude' | 'gemini' {
  const setting = process.env.AI_PROVIDER?.trim().toLowerCase()
  if (setting === 'claude') return 'claude'
  if (setting === 'gemini') return 'gemini'
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'claude'
  return 'gemini'
}

export async function aiGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  if (resolveProvider() === 'claude') return claudeGenerateText(opts)
  return geminiGenerateText(opts)
}
