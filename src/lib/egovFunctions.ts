import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, firebaseConfigured } from './firebase'
import type { EgovSignRole, StoredEgovSignature } from '../types/egovSignature'
import type {
  SigningDocumentResponse,
  SubmitSignatureResponse,
} from './egovFunctions.types'

const REGION = 'europe-west1'

function functionsInstance() {
  if (!app) throw new Error('Firebase не настроен')
  return getFunctions(app, REGION)
}

/** PDF с сервера + сессия подписания (промышленный режим). */
export async function fetchSigningDocument(
  permitId: string,
  role: EgovSignRole,
  clientPdf?: { documentHash: string; pdfByteLength: number },
): Promise<SigningDocumentResponse> {
  if (!firebaseConfigured) {
    throw new Error('fetchSigningDocument: нужен Firebase')
  }
  const fn = httpsCallable<
    {
      permitId: string
      role: EgovSignRole
      documentHash?: string
      pdfByteLength?: number
    },
    SigningDocumentResponse
  >(functionsInstance(), 'getSigningDocument')
  const res = await fn({
    permitId,
    role,
    documentHash: clientPdf?.documentHash,
    pdfByteLength: clientPdf?.pdfByteLength,
  })
  return res.data
}

/** CMS → серверная проверка ИИН/CMS → запись в Firestore. */
export async function submitEgovSignatureToServer(
  sessionId: string,
  cmsBase64: string,
  provider: StoredEgovSignature['provider'] = 'egov_mobile',
): Promise<StoredEgovSignature> {
  if (!firebaseConfigured) {
    throw new Error('submitEgovSignature: нужен Firebase')
  }
  const fn = httpsCallable<
    { sessionId: string; cmsBase64: string; provider?: string },
    SubmitSignatureResponse
  >(functionsInstance(), 'submitEgovSignature')
  const res = await fn({ sessionId, cmsBase64, provider })
  return res.data.signature
}

export async function fetchCrewAckDocument(
  permitId: string,
  clientPdf: { documentHash: string; pdfByteLength: number },
): Promise<{ sessionId: string; documentHash: string }> {
  if (!firebaseConfigured) {
    throw new Error('fetchCrewAckDocument: нужен Firebase')
  }
  const fn = httpsCallable<
    { permitId: string; documentHash: string; pdfByteLength: number },
    { sessionId: string; documentHash: string }
  >(functionsInstance(), 'getCrewAckDocument')
  const res = await fn({
    permitId,
    documentHash: clientPdf.documentHash,
    pdfByteLength: clientPdf.pdfByteLength,
  })
  return res.data
}

export async function submitCrewAcknowledgmentToServer(
  sessionId: string,
  cmsBase64: string,
  provider: import('../types/crewAck').StoredCrewAckSignature['provider'] = 'egov_mobile',
): Promise<import('../types/crewAck').StoredCrewAckSignature> {
  if (!firebaseConfigured) {
    throw new Error('submitCrewAcknowledgment: нужен Firebase')
  }
  const fn = httpsCallable<
    { sessionId: string; cmsBase64: string; provider?: string },
    { ok: boolean; signature: import('../types/crewAck').StoredCrewAckSignature }
  >(functionsInstance(), 'submitCrewAcknowledgment')
  const res = await fn({ sessionId, cmsBase64, provider })
  return res.data.signature
}
