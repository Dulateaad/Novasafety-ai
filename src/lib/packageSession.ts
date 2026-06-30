import { ASOR_EDITOR_AUTOSAVE_KEY, ASOR_PENDING_FOR_PERMIT_KEY } from '../types/asor'
import type { DemoUser } from '../types/domain'
import { PPR_FORM_STORAGE_KEY } from '../types/ppr'
import { NEW_PERMIT_DRAFT_AUTOSAVE_KEY } from './newPermitDraftAutosave'
import { clearNdGate } from './ndGate'
import { clearPprGate } from './pprGate'
import { clearPprForm } from './pprAutosave'
import { clearResumePermitId } from './resumePermitPackage'

export const PACKAGE_CLEARED_EVENT = 'nova-package-cleared'

const NDPR_MANUAL_FILL_KEY = 'nova_ndpr_manual_fill_v1'

const SESSION_USER_KEY = 'nova_session_user_v1'

export function syncSessionUser(user: DemoUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(
        SESSION_USER_KEY,
        JSON.stringify({ id: user.id, displayName: user.displayName, role: user.role }),
      )
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function resetSessionUser(): void {
  syncSessionUser(null)
}

export function setNdprManualFillMode(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(NDPR_MANUAL_FILL_KEY, '1')
    else sessionStorage.removeItem(NDPR_MANUAL_FILL_KEY)
  } catch {
    /* ignore */
  }
}

export function isNdprManualFillMode(): boolean {
  try {
    return sessionStorage.getItem(NDPR_MANUAL_FILL_KEY) === '1'
  } catch {
    return false
  }
}

const SESSION_KEYS_TO_CLEAR = [
  NEW_PERMIT_DRAFT_AUTOSAVE_KEY,
  ASOR_PENDING_FOR_PERMIT_KEY,
  ASOR_EDITOR_AUTOSAVE_KEY,
  PPR_FORM_STORAGE_KEY,
  'nova_ppr_form_v1',
] as const

/** Сброс локального пакета ППР → НДПР → Оценка Риска. */
export function clearPackageSession(): void {
  clearNdGate()
  clearPprGate()
  clearPprForm()
  clearResumePermitId()
  setNdprManualFillMode(false)
  try {
    for (const key of SESSION_KEYS_TO_CLEAR) {
      sessionStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PACKAGE_CLEARED_EVENT))
  }
}
