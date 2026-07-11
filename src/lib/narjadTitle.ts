import { titleFromFileName } from './pprAttachment'
import { cleanPprWorkTitle, normalizePprWorkTitle } from './pprWorkTitle'

export { cleanPprWorkTitle, normalizePprWorkTitle }

/** Имя файла Method Statement / ППР — не подставляем как наименование наряда. */
export function isLikelyFileNameTitle(title: string, attachmentFileName?: string): boolean {
  const t = title.trim()
  if (!t) return false
  if (attachmentFileName) {
    const stem = attachmentFileName.replace(/\.[^.]+$/, '').trim()
    if (t === stem) return true
    if (cleanPprWorkTitle(t) === titleFromFileName(attachmentFileName)) return true
  }
  if (!cleanPprWorkTitle(t)) return true
  return /^method\s+statement\b/i.test(t)
}

/** Краткое наименование для наряда: НДПР → поле АСОР, без имени файла ППР. */
export function pickNarjadShortTitle(
  ndTitle: string,
  asorShortTitle: string,
  attachmentFileName?: string,
): string {
  const nd = cleanPprWorkTitle(ndTitle)
  const asor = cleanPprWorkTitle(asorShortTitle)
  if (asor && !isLikelyFileNameTitle(asor, attachmentFileName)) return asor
  if (nd) return nd
  return asor
}

/** Актуальное наименование работ из текущего ППР (не имя файла и не старый черновик). */
export function effectivePprWorkTitle(ppr: import('../types/ppr').PprForm): string {
  const fileName = ppr.attachment?.fileName
  const candidates = [
    ppr.controlMeasures?.workTitle?.trim() ?? '',
    ppr.workTitle.trim(),
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (!isLikelyFileNameTitle(candidate, fileName)) return normalizePprWorkTitle(candidate)
  }
  return normalizePprWorkTitle(candidates[0] ?? '')
}
