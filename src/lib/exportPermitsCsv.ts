import type { Permit } from '../types/domain'
import { STATUS_LABELS, ZONE_CLASS_LABELS } from '../types/domain'
import { formatSpecialWorkActivitiesLabels } from '../types/domain'
import { formatStoredDateTime } from './datetimeLocal'

function csvCell(value: string): string {
  const v = value.replace(/"/g, '""')
  return `"${v}"`
}

/** Выгрузка журнала НД в CSV (открывается в Excel). */
export function downloadPermitsCsv(permits: Permit[], fileName = 'journal-nd.csv'): void {
  const header = [
    'Номер НД',
    'Наименование',
    'Объект',
    'Вид работ',
    'Зона',
    'Статус',
    'Создан',
    'Обновлён',
  ]

  const rows = permits.map((p) =>
    [
      p.registrationRefNo || p.id.slice(0, 8),
      p.title,
      p.siteName,
      formatSpecialWorkActivitiesLabels(p.specialWorkActivities, p.specialWorkActivity),
      ZONE_CLASS_LABELS[p.zoneClass],
      STATUS_LABELS[p.status],
      formatStoredDateTime(p.createdAtIso),
      formatStoredDateTime(p.updatedAtIso),
    ]
      .map((c) => csvCell(String(c ?? '')))
      .join(';'),
  )

  const bom = '\uFEFF'
  const body = [header.map(csvCell).join(';'), ...rows].join('\r\n')
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
