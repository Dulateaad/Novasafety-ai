import { matchPtwSiteFromText } from '../config/ptwSites'
import type { PprForm } from '../types/ppr'
import { buildPprTextHaystack } from './inferSpecialWorkActivityFromPpr'

export function inferPtwSiteFromPpr(ppr: PprForm, docText?: string): string | undefined {
  if (ppr.siteName.trim()) {
    const direct = matchPtwSiteFromText(ppr.siteName)
    if (direct) return direct
  }
  return matchPtwSiteFromText(buildPprTextHaystack(ppr, docText))
}
