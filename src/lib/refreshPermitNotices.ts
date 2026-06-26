export const PERMIT_NOTICES_REFRESH_EVENT = 'nova-permit-notices-refresh'

export function notifyPermitNoticesRefresh(): void {
  window.dispatchEvent(new Event(PERMIT_NOTICES_REFRESH_EVENT))
}
