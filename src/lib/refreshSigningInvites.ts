export const SIGNING_INVITES_REFRESH_EVENT = 'nova-signing-invites-refresh'

/** Сразу перечитать signingInvites после подписи (не ждать опрос 45 с). */
export function notifySigningInvitesRefresh(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SIGNING_INVITES_REFRESH_EVENT))
}
