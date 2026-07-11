import { ASOR_EDITION_META } from '../types/asor'
import type { Permit } from '../types/domain'
type WorkSource = Pick<
  Permit,
  'title' | 'workStages' | 'workDescription' | 'ppr' | 'asor'
>

/** Наименование работ — как в форме НДПР / из загруженного ППР. */
export function permitWorkTitle(permit: WorkSource): string {
  return (
    permit.title?.trim() ||
    permit.ppr?.workTitle?.trim() ||
    permit.asor?.shortTitleForNarjad?.trim() ||
    ''
  )
}

function looksLikeAsorDump(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (t.startsWith('—') || t.startsWith('-')) return true
  const markers = [
    ASOR_EDITION_META.title,
    ASOR_EDITION_META.formRef,
    'Задания и опасные факторы',
    'Дата АСОР:',
    'Матрица оценки',
    'Мероприятия по ОТ, ТБ и ООС',
    'Объём работ:',
    'Место проведения:',
  ]
  return markers.some((m) => t.includes(m))
}

/** Описание / этапы работ — как в НДПР (не сводка АСОР). */
export function permitWorkDescriptionNdpr(permit: WorkSource): string {
  if (permit.workStages?.trim()) return permit.workStages.trim()

  const pprStages = permit.ppr?.workStagesText?.trim()
  if (pprStages) return pprStages

  const pprDesc = permit.ppr?.workDescription?.trim()
  if (pprDesc) return pprDesc

  const wd = permit.workDescription?.trim()
  if (wd && !looksLikeAsorDump(wd)) return wd

  return ''
}
