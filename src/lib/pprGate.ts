/** Шаг процесса «ППР» перед заполнением АСОР (после черновика наряд-допуска). */
export const PPR_GATE_PASSED_KEY = 'nova_ppr_gate_passed_v1'

export function isPprGatePassed(): boolean {
  try {
    return sessionStorage.getItem(PPR_GATE_PASSED_KEY) === '1'
  } catch {
    return false
  }
}

export function setPprGatePassed(): void {
  sessionStorage.setItem(PPR_GATE_PASSED_KEY, '1')
}

export function clearPprGate(): void {
  sessionStorage.removeItem(PPR_GATE_PASSED_KEY)
}
