import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'

const REGION = 'europe-west1'
const LONG_CALLABLE_TIMEOUT_MS = 300_000

export function isClaudeServerAvailable(): boolean {
  return firebaseConfigured && Boolean(app)
}

/** Claude через Cloud Function (ANTHROPIC_API_KEY на сервере). */
export async function claudeServerAi(opts: {
  systemPrompt: string
  userPrompt: string
  mimeType?: string
  dataBase64?: string
  complex?: boolean
  /** false — обычный claudeGenerateText (чат); по умолчанию extraction для JSON-задач */
  extraction?: boolean
}): Promise<string> {
  if (!isClaudeServerAvailable() || !app) {
    throw new Error('claudeServerAi: нужен Firebase')
  }
  const fn = httpsCallable<
    {
      systemPrompt: string
      userPrompt: string
      mimeType?: string
      dataBase64?: string
      complex?: boolean
      extraction?: boolean
    },
    { raw: string }
  >(getFunctions(app, REGION), 'claudeAiFn', {
    timeout: LONG_CALLABLE_TIMEOUT_MS,
  })
  const res = await fn({
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    mimeType: opts.mimeType,
    dataBase64: opts.dataBase64?.replace(/\s+/g, ''),
    complex: opts.complex,
    extraction: opts.extraction,
  })
  const raw = res.data?.raw?.trim()
  if (!raw) throw new Error('Сервер Claude вернул пустой ответ')
  return raw
}
