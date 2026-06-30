/** Прокручивает к якорю (заголовок блока — в начало экрана). */
export function scrollToElement(anchor?: HTMLElement | null): void {
  anchor?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

/** Несколько попыток — после навигации и отрисовки блока. */
export function scrollToElementWithRetries(anchor?: HTMLElement | null): () => void {
  const run = () => scrollToElement(anchor)
  run()

  let rafInner = 0
  const rafOuter = requestAnimationFrame(() => {
    rafInner = requestAnimationFrame(run)
  })

  const timers = [80, 200, 450, 800, 1200].map((ms) => window.setTimeout(run, ms))

  return () => {
    cancelAnimationFrame(rafOuter)
    if (rafInner) cancelAnimationFrame(rafInner)
    timers.forEach((id) => window.clearTimeout(id))
  }
}

/** Прокручивает страницу в самый верх (окно и корневые элементы). */
export function scrollAppToTop(anchor?: HTMLElement | null): void {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  anchor?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

/** Несколько попыток — после навигации и подгрузки данных формы. */
export function scrollAppToTopWithRetries(anchor?: HTMLElement | null): () => void {
  const run = () => scrollAppToTop(anchor)
  run()

  let rafInner = 0
  const rafOuter = requestAnimationFrame(() => {
    rafInner = requestAnimationFrame(run)
  })

  const timers = [80, 200, 450, 800].map((ms) => window.setTimeout(run, ms))

  return () => {
    cancelAnimationFrame(rafOuter)
    if (rafInner) cancelAnimationFrame(rafInner)
    timers.forEach((id) => window.clearTimeout(id))
  }
}
