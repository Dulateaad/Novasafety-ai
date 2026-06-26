export function AiDisclaimerNotice(props: { className?: string }) {
  const { className } = props
  return (
    <p
      className={['journal-info-banner', className].filter(Boolean).join(' ')}
      role="note"
      style={{ marginBottom: '0.85rem' }}
    >
      <span className="journal-info-banner__icon" aria-hidden>
        i
      </span>
      <span>
        Результат генерации с помощью ИИ необходимо проверить: искусственный интеллект
        может допускать ошибки и неточности.
      </span>
    </p>
  )
}
