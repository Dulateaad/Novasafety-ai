/** Gen2 callable: публичный invoker — иначе браузер получает CORS на preflight. */
export const CALLABLE_OPTIONS = {
  region: 'europe-west1' as const,
  invoker: 'public' as const,
  timeoutSeconds: 120,
}

/** Долгие вызовы Claude (PDF ППР, тяжёлое извлечение). */
export const LONG_CALLABLE_OPTIONS = {
  ...CALLABLE_OPTIONS,
  timeoutSeconds: 300,
  memory: '1GiB' as const,
}
