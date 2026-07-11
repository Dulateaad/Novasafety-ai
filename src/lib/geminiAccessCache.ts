const DENIED_KEY = 'nova_gemini_access_denied_v1'

/** Запомнить 403 на сессию — не слать повторные запросы к API. */
export function markGeminiAccessDenied(): void {
  try {
    sessionStorage.setItem(DENIED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isGeminiAccessDenied(): boolean {
  try {
    return sessionStorage.getItem(DENIED_KEY) === '1'
  } catch {
    return false
  }
}

export function clearGeminiAccessDenied(): void {
  try {
    sessionStorage.removeItem(DENIED_KEY)
  } catch {
    /* ignore */
  }
}
