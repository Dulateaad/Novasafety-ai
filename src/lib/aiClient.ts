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
import {
  geminiChat,
  geminiGenerateText,
  geminiGenerateTextForExtraction,
  geminiGenerateWithFile,
  geminiGenerateWithFileForExtraction,
  isGeminiAccessDeniedError,
  isGeminiClientReady,
  isGeminiConfigured,
} from './geminiClient'

export function activeAiProvider() {
  return resolveAiProvider()
}

export function activeAiProviderLabel(): string {
  return aiProviderLabel(resolveAiProvider())
}

export function isAiConfigured(): boolean {
  const provider = resolveAiProvider()
  if (provider === 'claude') return isClaudeConfigured()
  if (provider === 'gemini') return isGeminiConfigured()
  return isClaudeConfigured() || isGeminiConfigured()
}

/** Клиентский ИИ доступен (ключ выбранного провайдера; для Gemini — без 403 в сессии). */
export function isAiClientReady(): boolean {
  const provider = resolveAiProvider()
  if (provider === 'claude') return isClaudeConfigured()
  if (provider === 'gemini') return isGeminiClientReady()
  if (isClaudeConfigured()) return true
  return isGeminiClientReady()
}

export function isAiAccessDeniedError(message: string): boolean {
  return isGeminiAccessDeniedError(message)
}

export async function aiGenerateText(opts: {
  systemPrompt: string
  userPrompt: string
  json?: boolean
}): Promise<string> {
  if (resolveAiProvider() === 'claude' || (resolveAiProvider() === 'auto' && isClaudeConfigured())) {
    return claudeGenerateText(opts)
  }
  return geminiGenerateText(opts)
}

export async function aiGenerateTextForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
}): Promise<string> {
  if (resolveAiProvider() === 'claude' || (resolveAiProvider() === 'auto' && isClaudeConfigured())) {
    return claudeGenerateTextForExtraction(opts)
  }
  return geminiGenerateTextForExtraction(opts)
}

export async function aiGenerateWithFileForExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  if (resolveAiProvider() === 'claude' || (resolveAiProvider() === 'auto' && isClaudeConfigured())) {
    return claudeGenerateWithFileForExtraction(opts)
  }
  return geminiGenerateWithFileForExtraction(opts)
}

/** PDF и другие тяжёлые multimodal-задачи — Sonnet (VITE_CLAUDE_COMPLEX_EXTRACTION_MODEL). */
export async function aiGenerateWithFileForComplexExtraction(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
}): Promise<string> {
  if (resolveAiProvider() === 'claude' || (resolveAiProvider() === 'auto' && isClaudeConfigured())) {
    return claudeGenerateWithFileForComplexExtraction(opts)
  }
  return geminiGenerateWithFileForExtraction(opts)
}

export async function aiGenerateWithFile(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType: string
  dataBase64: string
  json?: boolean
}): Promise<string> {
  if (resolveAiProvider() === 'claude' || (resolveAiProvider() === 'auto' && isClaudeConfigured())) {
    return claudeGenerateWithFileForExtraction({
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      mimeType: opts.mimeType,
      dataBase64: opts.dataBase64,
    })
  }
  return geminiGenerateWithFile(opts)
}

export async function aiChat(opts: {
  systemPrompt: string
  history: UiChatTurn[]
}): Promise<string> {
  if (resolveAiProvider() === 'claude' || (resolveAiProvider() === 'auto' && isClaudeConfigured())) {
    return claudeChat(opts)
  }
  return geminiChat(opts)
}
