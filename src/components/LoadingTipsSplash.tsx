import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const STORAGE_KEY = 'nova_loading_tips_seen_v1'
const SHOW_MS = 4200

export function LoadingTipsSplash() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [tipIndex] = useState(() =>
    Math.floor(Math.random() * t.loadingTips.tips.length),
  )

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return
      sessionStorage.setItem(STORAGE_KEY, '1')
      setVisible(true)
      const timer = window.setTimeout(() => setVisible(false), SHOW_MS)
      return () => window.clearTimeout(timer)
    } catch {
      return undefined
    }
  }, [])

  if (!visible) return null

  return (
    <div className="loading-tips-splash" role="status" aria-live="polite">
      <div className="loading-tips-splash__card">
        <div className="loading-tips-splash__mascot" aria-hidden>
          🦺
        </div>
        <p className="loading-tips-splash__title">{t.loadingTips.title}</p>
        <p className="loading-tips-splash__tip">{t.loadingTips.tips[tipIndex]}</p>
      </div>
    </div>
  )
}
