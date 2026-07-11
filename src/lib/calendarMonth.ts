/**
 * Сдвиг даты в формате ISO `yyyy-mm-dd` на один календарный месяц
 * (типичный срок действия наряда — месяц).
 */
export function addOneCalendarMonth(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return ''
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return ''
  dt.setMonth(dt.getMonth() + 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** +1 месяц к дате начала; время начала сохраняется в endDate. */
export function addOneCalendarMonthFromStart(startValue: string): string {
  const datePart = startValue.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return ''
  const nextDate = addOneCalendarMonth(datePart)
  if (!nextDate) return ''
  const timeMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(startValue.trim())
  return timeMatch ? `${nextDate}T${timeMatch[2]}` : nextDate
}
