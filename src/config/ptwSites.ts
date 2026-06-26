/**
 * Допустимые объекты (локации) для наряд-допусков — фиксированный перечень.
 */
export const PTW_SITE_OPTIONS = [
  '21 скважина',
  '10 скважина',
  '12 скважина',
  '26 скважина',
  'Сборочная станция',
  'Передаточная станция',
] as const

export type PtwSiteOption = (typeof PTW_SITE_OPTIONS)[number]

export const PTW_SITES_SET = new Set<string>(PTW_SITE_OPTIONS)

function wellNumberToSite(num: string): PtwSiteOption | undefined {
  const site = `${num} скважина`
  return PTW_SITES_SET.has(site) ? (site as PtwSiteOption) : undefined
}

/** Определяет объект / локацию по тексту ППР (U12 → «12 скважина» и т.д.). */
export function matchPtwSiteFromText(text: string): PtwSiteOption | undefined {
  const haystack = text.trim()
  if (!haystack) return undefined

  const sitesByLength = [...PTW_SITE_OPTIONS].sort((a, b) => b.length - a.length)
  for (const site of sitesByLength) {
    if (haystack.includes(site)) return site
  }

  for (const match of haystack.matchAll(/\bU\s*-?\s*(\d{1,2})\b/gi)) {
    const site = wellNumberToSite(match[1])
    if (site) return site
  }

  const wellPatterns = [
    /скважин[аы]?\s*(?:№|#|n)?\s*(\d{1,2})\b/i,
    /\b(\d{1,2})\s*скважин[аы]?\b/i,
    /\bwell\s*(?:no\.?|#)?\s*(\d{1,2})\b/i,
  ]
  for (const pattern of wellPatterns) {
    const match = haystack.match(pattern)
    if (match) {
      const site = wellNumberToSite(match[1])
      if (site) return site
    }
  }

  if (/сборн(?:ая|ой)?\s+станц/i.test(haystack)) return 'Сборочная станция'
  if (/передаточн(?:ая|ой)?\s+станц/i.test(haystack)) return 'Передаточная станция'

  return undefined
}

/** Приводит сохранённое значение к известному объекту или сохраняет текст из ППР. */
export function coercePtwSite(raw: string | undefined, textHint?: string): string {
  const s = (raw ?? '').trim()
  if (PTW_SITES_SET.has(s)) return s
  const inferred = textHint ? matchPtwSiteFromText(textHint) : undefined
  if (inferred) return inferred
  const fromRaw = matchPtwSiteFromText(s)
  if (fromRaw) return fromRaw
  if (s.length >= 3) return s.slice(0, 200)
  return ''
}
