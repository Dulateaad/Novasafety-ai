import { attachControlMeasuresPdf } from './extractPprControlMeasures'
import type { PprControlMeasuresDoc } from '../types/ppr'
import { downloadControlMeasuresPdf as downloadPdfBlob } from './buildControlMeasuresPdf'

/** Скачать PDF; при необходимости собрать на лету. */
export async function downloadControlMeasuresPdfOrBuild(
  doc: PprControlMeasuresDoc,
): Promise<PprControlMeasuresDoc> {
  if (doc.pdfBase64?.trim()) {
    downloadPdfBlob(doc)
    return doc
  }
  const { doc: withPdf } = await attachControlMeasuresPdf(doc)
  downloadPdfBlob(withPdf)
  return withPdf
}
