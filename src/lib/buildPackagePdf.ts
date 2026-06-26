import type { DemoUser, PackagePdfDocument, Permit } from '../types/domain'
import {
  buildPermitPackagePartPdf,
  buildSigningPackagePdf,
} from './buildSigningPackagePdf'
import { preloadPdfMakeEngine } from './pdfMakeEngine'
import { openPdfInBrowser, pdfTabTitleFromFileName } from './pdfPreview'

export { preloadPdfMakeEngine as preloadPackagePdfEngine }
export type { PackagePdfPart } from './buildSigningPackagePdf'
export { buildPermitPackagePartPdf }

/** Официальный PDF-пакет: НДПР + АБР + оценка риска (единый файл). */
export async function buildPackagePdf(
  permit: Permit,
  resolveUser: (uid: string) => DemoUser | undefined,
  directory: DemoUser[] = [],
): Promise<PackagePdfDocument> {
  return buildSigningPackagePdf(permit, resolveUser, directory)
}

export function viewPackagePdf(doc: PackagePdfDocument): void {
  const b64 = doc.pdfBase64
  if (!b64) return
  openPdfInBrowser(b64, pdfTabTitleFromFileName(doc.fileName))
}

export function downloadPackagePdf(doc: PackagePdfDocument): void {
  viewPackagePdf(doc)
}
