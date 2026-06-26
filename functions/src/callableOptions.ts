/** Gen2 callable: публичный invoker — иначе браузер получает CORS на preflight. */
export const CALLABLE_OPTIONS = {
  region: 'europe-west1' as const,
  invoker: 'public' as const,
  timeoutSeconds: 120,
}
