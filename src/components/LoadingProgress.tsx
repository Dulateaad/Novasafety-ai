import { useEffect, useState } from 'react'
import { APP_NAME } from '../config/branding'
import { useLanguage } from '../context/LanguageContext'
import { LottieRobot } from './LottieRobot'

const TIP_ROTATE_MS = 3800

export function LoadingProgress(props: {
  label?: string
  /** 0–100; без значения — бегущая шкала */
  value?: number
  /** Плавно догоняет value → creepTo, пока операция идёт */
  creepTo?: number
  indeterminate?: boolean
  className?: string
  /** Показать анимированного робота и сменяющиеся советы (для долгих шагов). */
  withTips?: boolean
  /** Полноэкранный оверлей по центру (генерация ИИ). */
  fullscreen?: boolean
}) {
  const { t } = useLanguage()
  const {
    label = `${APP_NAME}…`,
    value,
    creepTo,
    indeterminate,
    className,
    withTips,
    fullscreen,
  } = props
  const [displayValue, setDisplayValue] = useState(value ?? 0)
  const tips = t.loadingTips.tips
  const [tipIndex, setTipIndex] = useState(() =>
    tips.length ? Math.floor(Math.random() * tips.length) : 0,
  )

  useEffect(() => {
    if (value === undefined) return
    setDisplayValue((prev) => Math.max(prev, value))
  }, [value])

  useEffect(() => {
    if (value === undefined || creepTo === undefined) return
    const target = Math.max(creepTo, value)
    const id = window.setInterval(() => {
      setDisplayValue((prev) => {
        if (prev >= target) return prev
        const step = Math.max(0.4, (target - prev) * 0.08)
        return Math.min(target, prev + step)
      })
    }, 150)
    return () => window.clearInterval(id)
  }, [value, creepTo])

  useEffect(() => {
    if (!withTips || tips.length < 2) return
    const id = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, TIP_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [withTips, tips.length])

  const runIndeterminate = indeterminate ?? value === undefined
  const width = runIndeterminate
    ? undefined
    : Math.min(100, Math.max(0, displayValue))

  const body = (
    <div
      className={[
        'loading-progress',
        withTips ? 'loading-progress--tips' : '',
        fullscreen ? 'loading-progress--fullscreen-panel' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {withTips && (
        <div className="loading-progress__robot" aria-hidden>
          <LottieRobot className="loading-progress__robot-anim" />
        </div>
      )}
      <div className="loading-progress__label">{label}</div>
      <div className="loading-progress__track" aria-hidden="true">
        <div
          className={[
            'loading-progress__bar',
            runIndeterminate ? 'loading-progress__bar--indeterminate' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={width !== undefined ? { width: `${width}%` } : undefined}
        />
      </div>
      {!runIndeterminate && width !== undefined && (
        <div className="loading-progress__pct muted xsmall" aria-hidden="true">
          {Math.round(width)}%
        </div>
      )}
      {withTips && tips.length > 0 && (
        <p className="loading-progress__tip" key={tipIndex}>
          {tips[tipIndex]}
        </p>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="ai-loading-overlay" aria-hidden={false}>
        {body}
      </div>
    )
  }

  return body
}
