import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { en } from '../i18n/locales/en'
import { ru, type LanguageCode, type Locale } from '../i18n/locales/ru'

const STORAGE_KEY = 'nova_lang_v1'

const LOCALES: Record<LanguageCode, Locale> = { ru, en }

function loadLanguage(): LanguageCode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}

type LanguageContextValue = {
  language: LanguageCode
  t: Locale
  setLanguage: (code: LanguageCode) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider(props: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => loadLanguage())

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      language,
      t: LOCALES[language],
      setLanguage,
    }),
    [language, setLanguage],
  )

  return (
    <LanguageContext.Provider value={value}>{props.children}</LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage requires LanguageProvider')
  return ctx
}
