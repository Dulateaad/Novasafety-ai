import type { StoredEgovSignature } from '../types/egovSignature'

export interface SigningDocumentResponse {
  sessionId: string
  documentHash: string
  pdfBase64: string
  dataBase64: string
  documentFormat: 'pdf'
}

export interface SubmitSignatureResponse {
  ok: boolean
  signature: StoredEgovSignature
}
