import { aiProviderLabel, resolveAiProvider } from '../config/aiProvider'
import type { UiChatTurn } from './chatAssistant'
import {
  claudeChat,
  claudeGenerateText,
  claudeGenerateTextForExtraction,
  claudeGenerateWithFileForComplexExtraction,
  claudeGenerateWithFileForExtraction,
  isClaudeConfigured,
} from './claudeClient'
import { claudeServerAi, isClaudeServerAvailable } from './claudeServerAi'

export function activeAiProvider() {
  return resolveAiProvider()
}

export function activeAiProviderLabel(): string {
  return aiProviderLabel()
}

export function isAiConfigured(): boolean {
  return isClaudeServerAvailable() || isClaudeConfigured()
}

export function isAiClientReady(): boolean {
  return isClaudeServerAvailable() || isClaudeConfigured()
}

export function isAiAccessDeniedError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('401') || m.includes('invalid x-api-key') || m.includes('authentication')
}

export async function aiGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  if (isClaudeServerAvailable()) {
    return claudeServerAi({
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      extraction: opts.json === false,
    })
  }
  return claudeGenerateText(opts)
}

export async function aiGenerateTextForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  if (isClaudeServerAvailable()) {
    return claudeServerAi({
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
    })
  }
  return claudeGenerateTextForExtraction(opts)
}

/** PDF ППР и multimodal-извлечение — Haiku (VITE_CLAUDE_EXTRACTION_MODEL). */
export async function aiGenerateWithFileForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  if (isClaudeServerAvailable()) {
    return claudeServerAi({
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      mimeType: opts.mimeType,
      dataBase64: opts.dataBase64,
      complex: false,
    })
  }
  return claudeGenerateWithFileForExtraction(opts)
}

/** NEBOSH и другие тяжёлые задачи — Sonnet (VITE_CLAUDE_COMPLEX_EXTRACTION_MODEL). */
export async function aiGenerateWithFileForComplexExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  if (isClaudeServerAvailable()) {
    return claudeServerAi({
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      mimeType: opts.mimeType,
      dataBase64: opts.dataBase64,
      complex: true,
    })
  }
  return claudeGenerateWithFileForComplexExtraction(opts)
}

export async function aiGenerateWithFile(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
  json?: boolean
}): Promise<string> {
  return aiGenerateWithFileForExtraction({
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    mimeType: opts.mimeType,
    dataBase64: opts.dataBase64,
  })
}

export async function aiChat(opts: {
  systemPrompt: string
  history: UiChatTurn[]
}): Promise<string> {
  if (isClaudeServerAvailable()) {
    const transcript = opts.history
      .map((turn) => `${turn.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${turn.content}`)
      .join('\n\n')
    return claudeServerAi({
      systemPrompt: opts.systemPrompt,
      userPrompt: transcript,
      extraction: false,
    })
  }
  return claudeChat(opts)
}
