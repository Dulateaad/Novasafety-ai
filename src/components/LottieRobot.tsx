import { useEffect, useRef } from 'react'

type LottieInstance = { destroy: () => void }

/** Анимированный вектор-робот (Lottie) для экранов загрузки. */
export function LottieRobot({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let anim: LottieInstance | null = null
    let cancelled = false

    void Promise.all([
      import('lottie-web'),
      fetch(`${import.meta.env.BASE_URL}animations/robot-bot.json`).then((r) =>
        r.json(),
      ),
    ])
      .then(([lottieMod, data]) => {
        if (cancelled || !ref.current) return
        const lottie = lottieMod.default
        anim = lottie.loadAnimation({
          container: ref.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
        })
      })
      .catch(() => {
        /* анимация не критична — тихо игнорируем */
      })

    return () => {
      cancelled = true
      anim?.destroy()
    }
  }, [])

  return <div ref={ref} className={className} aria-hidden />
}
