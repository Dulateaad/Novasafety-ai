const RISK_GATE_KEY = 'nova_risk_gate_passed_v1'

export function isRiskGatePassed(): boolean {
  try {
    return sessionStorage.getItem(RISK_GATE_KEY) === '1'
  } catch {
    return false
  }
}

export function setRiskGatePassed(): void {
  try {
    sessionStorage.setItem(RISK_GATE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearRiskGate(): void {
  try {
    sessionStorage.removeItem(RISK_GATE_KEY)
  } catch {
    /* ignore */
  }
}
