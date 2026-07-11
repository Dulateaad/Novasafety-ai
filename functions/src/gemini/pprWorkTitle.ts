/** Убирает «Method Statement», даты и служебные хвосты из наименования ППР/наряда. */
export function cleanPprWorkTitle(raw: string): string {
  let t = raw.trim()
  if (!t) return ''

  t = t.replace(/\bmethod\s+statement\b/gi, ' ')
  t = t.replace(/^ms[\s._-]+/i, '')
  t = t.replace(/\bms\b(?=\s)/gi, ' ')

  t = t.replace(/\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/g, ' ')
  t = t.replace(/\b\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\b/g, ' ')
  t = t.replace(/\(\s*\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\s*\)/g, ' ')
  t = t.replace(/\(\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*\)/g, ' ')

  t = t.replace(/\s*[-–—]\s*GS\s*$/i, '')
  t = t.replace(/\s+rev\.?\s*\d*\s*$/i, '')

  t = t.replace(/\s+/g, ' ')
  t = t.replace(/\s*[-–—]\s*$/g, '')
  t = t.replace(/^[\s\-–—,_]+|[\s\-–—,_]+$/g, '')

  return t.trim()
}

export function normalizePprWorkTitle(raw: string, fallback = ''): string {
  const cleaned = cleanPprWorkTitle(raw)
  if (cleaned) return cleaned
  const fb = cleanPprWorkTitle(fallback)
  return fb || fallback.trim()
}
