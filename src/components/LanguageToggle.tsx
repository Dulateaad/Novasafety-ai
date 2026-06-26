import type { LanguageCode } from '../i18n/locales/ru'
import { useLanguage } from '../context/LanguageContext'

type LanguageToggleProps = {
  className?: string
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div
      className={`lang-toggle${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={t.common.language}
    >
      {(['ru', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-toggle__btn${language === code ? ' lang-toggle__btn--active' : ''}`}
          aria-pressed={language === code}
          aria-label={code === 'ru' ? t.langLabel : 'English'}
          onClick={() => setLanguage(code as LanguageCode)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
