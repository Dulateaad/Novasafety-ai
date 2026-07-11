import { claudeGenerateWithFileForExtraction } from './client'
import {
  buildControlMeasuresPdfRetryPrompt,
  buildControlMeasuresPdfUserPrompt,
  PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
} from './pprPdfPrompts'

export async function extractPprControlMeasuresPdfRaw(args: {
  dataBase64: string
  fileName: string
}): Promise<string> {
  const attempts: Array<{ prompt: string; complex: boolean }> = [
    { prompt: buildControlMeasuresPdfUserPrompt(args.fileName), complex: true },
    { prompt: buildControlMeasuresPdfUserPrompt(args.fileName), complex: false },
    { prompt: buildControlMeasuresPdfRetryPrompt(args.fileName), complex: true },
  ]

  let lastError = 'Claude не ответил'

  for (const attempt of attempts) {
    try {
      return await claudeGenerateWithFileForExtraction({
        systemPrompt: PPR_CONTROL_MEASURES_SYSTEM_PROMPT,
        userPrompt: attempt.prompt,
        mimeType: 'application/pdf',
        dataBase64: args.dataBase64,
        complex: attempt.complex,
      })
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }

  throw new Error(lastError)
}
