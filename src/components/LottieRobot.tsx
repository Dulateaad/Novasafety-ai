import lottie, { type AnimationItem } from 'lottie-web'
import { useEffect, useRef } from 'react'
import { patchThinkingAnimation } from '../lib/patchThinkingAnimation'

/** Анимированный бот (Lottie JSON) для экранов загрузки. */
export function LottieRobot({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    void fetch(`${import.meta.env.BASE_URL}animations/thinking.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`thinking.json: ${r.status}`)
        return r.json()
      })
      .then((animationData) => {
        const patched = patchThinkingAnimation(animationData)
        if (cancelled || !containerRef.current) return
        animRef.current?.destroy()
        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: patched,
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      animRef.current?.destroy()
      animRef.current = null
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden />
}
