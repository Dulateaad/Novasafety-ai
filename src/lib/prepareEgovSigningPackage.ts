import type { Permit } from '../types/domain'
import type { EgovSignRole } from '../types/egovSignature'
import type { DemoUser } from '../types/domain'
import { buildSigningPackagePdf } from './buildSigningPackagePdf'
import { buildSigningPayload } from './buildSigningPayload'
import { fetchSigningDocument } from './egovFunctions'

export interface EgovSigningPackage {
  dataBase64: string
  documentHash: string
  isPdf: boolean
  sessionId: string | null
}

export async function prepareEgovSigningPackage(opts: {
  permit: Permit
  role: EgovSignRole
  signerUid: string
  signerName: string
  useServerPdf: boolean
  resolveUser: (uid: string) => DemoUser | undefined
  userDirectory: DemoUser[]
}): Promise<EgovSigningPackage> {
  const { permit, role, signerUid, signerName, useServerPdf, resolveUser, userDirectory } =
    opts

  if (useServerPdf) {
    const pkg = await buildSigningPackagePdf(permit, resolveUser, userDirectory, {
      role,
      signerName,
    })
    if (!pkg.pdfBase64) {
      throw new Error('Не удалось сформировать PDF-пакет')
    }
    const pdfBytes = Uint8Array.from(atob(pkg.pdfBase64), (c) => c.charCodeAt(0))
    const doc = await fetchSigningDocument(permit.id, role, {
      documentHash: pkg.documentHash,
      pdfByteLength: pdfBytes.length,
    })
    return {
      dataBase64: pkg.pdfBase64,
      documentHash: pkg.documentHash,
      isPdf: true,
      sessionId: doc.sessionId,
    }
  }

  const payload = await buildSigningPayload(permit, role, signerUid, signerName)
  return {
    dataBase64: payload.dataBase64,
    documentHash: payload.documentHash,
    isPdf: false,
    sessionId: null,
  }
}
