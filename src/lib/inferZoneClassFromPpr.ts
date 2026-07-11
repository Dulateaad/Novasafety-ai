import type { ZoneClass } from '../types/domain'
import type { PprForm } from '../types/ppr'
import { buildPprTextHaystack } from './inferSpecialWorkActivityFromPpr'

/** Определяет классификацию зоны (01–03) по тексту ППР. */
export function inferZoneClassFromText(haystack: string): ZoneClass | null {
  const text = haystack.trim()
  if (!text) return null

  const classLine = text.match(
    /классификац[^\n]{0,24}зон[^\n]{0,40}(?:№|#|:)?\s*0?([123])\b/i,
  )
  if (classLine) {
    const n = Number(classLine[1])
    if (n >= 1 && n <= 3) return n as ZoneClass
  }

  const patterns: { zone: ZoneClass; re: RegExp }[] = [
    { zone: 3, re: /(?:зон[аы]\s*(?:классификации\s*)?|class\s*)0?3\b/i },
    { zone: 2, re: /(?:зон[аы]\s*(?:классификации\s*)?|class\s*)0?2\b/i },
    { zone: 1, re: /(?:зон[аы]\s*(?:классификации\s*)?|class\s*)0?1\b/i },
  ]
  for (const { zone, re } of patterns) {
    if (re.test(text)) return zone
  }
  return null
}

export function inferZoneClassFromPpr(
  ppr: PprForm,
  docText?: string,
): ZoneClass | null {
  return inferZoneClassFromText(buildPprTextHaystack(ppr, docText))
}
