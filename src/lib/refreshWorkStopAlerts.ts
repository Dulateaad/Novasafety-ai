export const WORK_STOP_ALERTS_REFRESH_EVENT = 'nova-work-stop-alerts-refresh'

export function notifyWorkStopAlertsRefresh(): void {
  window.dispatchEvent(new CustomEvent(WORK_STOP_ALERTS_REFRESH_EVENT))
}
