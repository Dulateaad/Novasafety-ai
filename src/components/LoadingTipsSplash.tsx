import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { LottieRobot } from './LottieRobot'

const STORAGE_KEY = 'nova_loading_tips_seen_v1'
const SHOW_MS = 4200
const TIP_ROTATE_MS = 3800

export function LoadingTipsSplash() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const tips = t.loadingTips.tips
  const [tipIndex, setTipIndex] = useState(() =>
    tips.length ? Math.floor(Math.random() * tips.length) : 0,
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

  useEffect(() => {
    if (!visible || tips.length < 2) return
    const id = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, TIP_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [visible, tips.length])

  if (!visible) return null

  return (
    <div className="loading-tips-splash" role="status" aria-live="polite">
      <div className="loading-tips-splash__card">
        <div className="loading-progress__robot loading-tips-splash__mascot" aria-hidden>
          <LottieRobot className="loading-progress__robot-anim" />
        </div>
        <p className="loading-tips-splash__title">{t.loadingTips.title}</p>
        <p className="loading-tips-splash__tip" key={tipIndex}>
          {tips[tipIndex]}
        </p>
      </div>
    </div>
  )
}
