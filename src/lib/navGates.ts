import { localeMessages } from '../i18n/getLocale'
import { isNdGatePassed } from './ndGate'
import { isPprGatePassed } from './pprGate'
import { isPermissionsNavAccessible, isPermissionsTabRelevant } from './workPermissionsNav'

export const NAV_GATES_CHANGED = 'nova-nav-gates-changed'

export function notifyNavGatesChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAV_GATES_CHANGED))
  }
}

/** Журнал и ППР — всегда; остальные по мере прохождения шагов. */
export function isNavRouteAccessible(to: string): boolean {
  if (to === '/' || to === '/ppr') return true
  if (to === '/new') return isPprGatePassed()
  if (to === '/risk-assessment') return isNdGatePassed()
  if (to === '/permissions') return isPermissionsNavAccessible()
  return true
}

export function isPermissionsNavVisible(): boolean {
  return isPermissionsTabRelevant()
}

export function navRouteLockedHint(to: string): string | null {
  if (isNavRouteAccessible(to)) return null
  const a = localeMessages().access
  if (to === '/new') return localeMessages().pages.ndprGatePpr
  if (to === '/risk-assessment') return a.gateNdpr
  if (to === '/permissions') {
    if (!isPermissionsTabRelevant()) return a.gatePermissionsNotNeeded
    return a.gatePermissions
  }
  return a.gateUnavailable
}
