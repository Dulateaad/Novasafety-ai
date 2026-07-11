export type AiProvider = 'claude'

/** В приложении используется только Claude (Anthropic API). */
export function resolveAiProvider(): AiProvider {
  return 'claude'
}

export function aiProviderLabel(_provider: AiProvider = 'claude'): string {
  return 'Claude'
}
