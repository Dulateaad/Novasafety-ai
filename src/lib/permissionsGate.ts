const PERMISSIONS_GATE_KEY = 'nova_permissions_gate_passed_v1'

export function isPermissionsGatePassed(): boolean {
  try {
    return sessionStorage.getItem(PERMISSIONS_GATE_KEY) === '1'
  } catch {
    return false
  }
}

export function setPermissionsGatePassed(): void {
  try {
    sessionStorage.setItem(PERMISSIONS_GATE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearPermissionsGate(): void {
  try {
    sessionStorage.removeItem(PERMISSIONS_GATE_KEY)
  } catch {
    /* ignore */
  }
}
