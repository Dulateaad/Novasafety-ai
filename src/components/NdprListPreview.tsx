/** Читабельный список из текста НДПР (строки с «•» или обычные переносы). */
export function NdprListPreview(props: { value: string; className?: string }) {
  const items = props.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-–—•·]\s*/, ''))

  if (items.length === 0) return null

  return (
    <ul className={props.className ?? 'ndpr-list-preview'}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
