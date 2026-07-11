import { extractWorkTitleFromDocHeader } from './pprWorkTitle'
import { extractTextFromPprAttachment } from './pprDocText'
import { isPdfAttachment } from './pprGeminiPdfExtract'
import { extractOrgPartiesFromText } from './inferContractorOrgFromPpr'
import { matchPtwSiteFromText } from '../config/ptwSites'
import { enrichPprNdprFieldsSync } from './pprNdprRules'
import type { PprForm } from '../types/ppr'
import { loadPprForm, savePprForm } from './pprAutosave'

/** Догружает поля ППР из текста документа для подстановки в НДПР. */
export async function resolvePprForNdpr(
  raw: PprForm = loadPprForm(),
): Promise<{ ppr: PprForm; docText?: string }> {
  let ppr = enrichPprNdprFieldsSync(raw)
  let docText: string | undefined

  const att = ppr.attachment
  if (!att?.dataBase64 || isPdfAttachment(att)) {
    return { ppr }
  }

  try {
    docText = await extractTextFromPprAttachment(att)
    const headerTitle = extractWorkTitleFromDocHeader(docText)
    if (headerTitle && !ppr.workTitle.trim()) {
      ppr = { ...ppr, workTitle: headerTitle }
    }
    const site = matchPtwSiteFromText(docText)
    if (site && !ppr.siteName.trim()) {
      ppr = { ...ppr, siteName: site }
    }
    const parties = extractOrgPartiesFromText(docText)
    if (parties.contractor && !ppr.contractorOrg.trim()) {
      ppr = { ...ppr, contractorOrg: parties.contractor }
    }
    if (parties.customer && !ppr.customerOrg.trim()) {
      ppr = { ...ppr, customerOrg: parties.customer }
    }
    ppr = enrichPprNdprFieldsSync(ppr)
  } catch {
    /* docx text optional */
  }

  return { ppr, docText }
}

export async function refreshPprAndMergeNdpr<T>(
  merge: (ppr: PprForm, docText?: string) => T,
): Promise<T> {
  const { ppr, docText } = await resolvePprForNdpr()
  savePprForm(ppr)
  return merge(ppr, docText)
}
