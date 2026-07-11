import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'
import type { PprControlMeasuresItem } from '../types/ppr'
import type { PprNdprExtract } from './pprNdprExtract'

const REGION = 'europe-west1'

export interface GeminiControlMeasuresResponse {
  workTitle: string
  items: PprControlMeasuresItem[]
  ndprExtract?: PprNdprExtract
}

/** Gemini на сервере (ключ GEMINI_API_KEY в Cloud Functions). */
export async function extractControlMeasuresViaGeminiFunction(
  documentText: string,
  fileName: string,
): Promise<GeminiControlMeasuresResponse> {
  if (!firebaseConfigured || !app) {
    throw new Error('extractControlMeasuresViaGeminiFunction: нужен Firebase')
  }
  const fn = httpsCallable<
    { documentText: string; fileName: string },
    GeminiControlMeasuresResponse
  >(getFunctions(app, REGION), 'extractPprControlMeasuresGemini')
  const res = await fn({ documentText, fileName })
  return res.data
}
