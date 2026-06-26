/** Увеличивайте при проблемах со старым PWA-кэшем после деплоя. */
const CACHE_GENERATION = '6'

const STORAGE_KEY = 'nova-sw-cache-generation'

/** Сбрасывает устаревший SW и Cache Storage один раз за поколение. */
export async function ensureFreshServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (localStorage.getItem(STORAGE_KEY) === CACHE_GENERATION) return

  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map((r) => r.unregister()))
  const keys = await caches.keys()
  await Promise.all(keys.map((k) => caches.delete(k)))
  localStorage.setItem(STORAGE_KEY, CACHE_GENERATION)

  if (regs.length > 0 || keys.length > 0) {
    location.reload()
  }
}
