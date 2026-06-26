import type { PprControlMeasuresDoc } from '../types/ppr'
import { attachControlMeasuresPdf } from './extractPprControlMeasures'

/** Дополняет старые записи без PDF (миграция sessionStorage). */
export async function ensureControlMeasuresPdf(
  doc: PprControlMeasuresDoc,
): Promise<PprControlMeasuresDoc> {
  if (doc.pdfBase64?.trim()) return doc
  const { doc: withPdf } = await attachControlMeasuresPdf(doc)
  return withPdf
}
