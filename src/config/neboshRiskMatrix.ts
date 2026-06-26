import type { AsorTaskResidualRisk } from '../types/asor'

/** Шкала NEBOSH 1–5 (0 = не задано). */
export type NeboshScaleValue = 0 | 1 | 2 | 3 | 4 | 5

export const NEBOSH_LIKELIHOOD_LABELS: Record<Exclude<NeboshScaleValue, 0>, string> = {
  1: '1 — Редко',
  2: '2 — Маловероятно',
  3: '3 — Возможно',
  4: '4 — Вероятно',
  5: '5 — Почти наверняка',
}

export const NEBOSH_SEVERITY_LABELS: Record<Exclude<NeboshScaleValue, 0>, string> = {
  1: '1 — Незначительные',
  2: '2 — Малые',
  3: '3 — Средние',
  4: '4 — Тяжёлые',
  5: '5 — Катастрофические',
}

export type NeboshRiskBand = '' | 'low' | 'medium' | 'high'

export const NEBOSH_RISK_BAND_LABELS: Record<Exclude<NeboshRiskBand, ''>, string> = {
  low: 'НИЗКИЙ',
  medium: 'СРЕДНИЙ',
  high: 'ВЫСОКИЙ',
}

export const NEBOSH_MATRIX_ROWS = [5, 4, 3, 2, 1] as const
export const NEBOSH_MATRIX_COLS = [1, 2, 3, 4, 5] as const

export function neboshRiskScore(
  likelihood: NeboshScaleValue,
  severity: NeboshScaleValue,
): number {
  if (!likelihood || !severity) return 0
  return likelihood * severity
}

export function neboshRiskBand(score: number): NeboshRiskBand {
  if (score <= 0) return ''
  if (score >= 15) return 'high'
  if (score >= 8) return 'medium'
  return 'low'
}

export function neboshBandToResidual(band: NeboshRiskBand): AsorTaskResidualRisk {
  if (band === 'low') return 'low'
  if (band === 'medium') return 'medium'
  if (band === 'high') return 'high'
  return ''
}

export function parseNeboshScale(v: unknown): NeboshScaleValue {
  const n = Number(v)
  if (n >= 1 && n <= 5) return n as NeboshScaleValue
  return 0
}

/** Короткие подписи для PDF-матрицы (строки). */
export const NEBOSH_LIKELIHOOD_MATRIX: Record<Exclude<NeboshScaleValue, 0>, string> = {
  5: '5 — Почти наверняка',
  4: '4 — Вероятно',
  3: '3 — Возможно',
  2: '2 — Маловероятно',
  1: '1 — Редко',
}

/** Короткие подписи для PDF-матрицы (столбцы). */
export const NEBOSH_SEVERITY_SHORT: Record<Exclude<NeboshScaleValue, 0>, string> = {
  1: 'Незнач.',
  2: 'Малые',
  3: 'Средние',
  4: 'Тяжёлые',
  5: 'Катастр.',
}

export const NEBOSH_RISK_BAND_EN: Record<Exclude<NeboshRiskBand, ''>, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
}

export const NEBOSH_PDF_COLORS = {
  white: '#FFFFFF',
  headerDark: '#1e3a5f',
  headerMid: '#4a6fa5',
  labelBg: '#e8eef5',
  altRow: '#f5f8fc',
  groupHeader: '#d9e2ef',
} as const

/** Цвет ячейки матрицы 5×5 по баллу. */
export function neboshCellColor(score: number): string {
  const band = neboshRiskBand(score)
  if (band === 'high') return '#fecaca'
  if (band === 'medium') return '#fef08a'
  if (band === 'low') return '#bbf7d0'
  return '#f1f5f9'
}

export function neboshCellTextColor(score: number): string {
  const band = neboshRiskBand(score)
  if (band === 'high') return '#7f1d1d'
  if (band === 'medium') return '#713f12'
  if (band === 'low') return '#14532d'
  return '#334155'
}

export function neboshRiskBandFill(band: Exclude<NeboshRiskBand, ''>): string {
  if (band === 'high') return '#fecaca'
  if (band === 'medium') return '#fef08a'
  return '#bbf7d0'
}

export function neboshRiskBandTextColor(band: Exclude<NeboshRiskBand, ''>): string {
  if (band === 'high') return '#7f1d1d'
  if (band === 'medium') return '#713f12'
  return '#14532d'
}
