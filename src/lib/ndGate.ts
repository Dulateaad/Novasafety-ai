/** Шаг «НДПР» заполнен — можно открывать ППР. */
export const ND_GATE_PASSED_KEY = 'nova_nd_gate_passed_v1'

export function isNdGatePassed(): boolean {
  try {
    return sessionStorage.getItem(ND_GATE_PASSED_KEY) === '1'
  } catch {
    return false
  }
}

export function setNdGatePassed(): void {
  sessionStorage.setItem(ND_GATE_PASSED_KEY, '1')
}

export function clearNdGate(): void {
  sessionStorage.removeItem(ND_GATE_PASSED_KEY)
}
