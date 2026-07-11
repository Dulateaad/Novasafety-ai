/** Значение для `<input type="datetime-local">` из сохранённой строки. */
export function toDatetimeLocalInput(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(raw)
  if (!m) return ''
  const time = m[2] ?? '00:00'
  return `${m[1]}T${time}`
}

/** Нормализует ввод datetime-local → `YYYY-MM-DDTHH:mm`. */
export function normalizeDatetimeLocalInput(value: string): string {
  const v = value.trim()
  if (!v) return ''
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(v)
  if (!m) return v
  return `${m[1]}T${m[2]}`
}

export function datePartFromStored(value: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  return m ? m[1] : ''
}

/** Отображение даты/времени начала в карточке. */
export function formatStoredDateTime(value: string): string {
  const v = toDatetimeLocalInput(value)
  if (!v) return '—'
  const [date, time] = v.split('T')
  const [y, mo, d] = date.split('-')
  return `${d}.${mo}.${y} ${time}`
}
