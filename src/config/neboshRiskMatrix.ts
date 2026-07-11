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

/** Цвета PDF оценки риска (образец пакета NOVA / Excel Office). */
export const NEBOSH_PDF_COLORS = {
  white: '#FFFFFF',
  headerDark: '#1F4E79',
  headerMid: '#2E75B6',
  labelBg: '#D6E4F0',
  altRow: '#F2F2F2',
  groupHeader: '#1F4E79',
} as const

/** Цвет ячейки матрицы 5×5 по баллу. */
export function neboshCellColor(score: number): string {
  const band = neboshRiskBand(score)
  if (band === 'high') return '#FF0000'
  if (band === 'medium') return '#FF9900'
  if (band === 'low') return '#92D050'
  return '#FFFFFF'
}

export function neboshCellTextColor(score: number): string {
  const band = neboshRiskBand(score)
  if (band === 'high' || band === 'medium' || band === 'low') return '#FFFFFF'
  return '#000000'
}

export function neboshRiskBandFill(band: Exclude<NeboshRiskBand, ''>): string {
  if (band === 'high') return '#FF0000'
  if (band === 'medium') return '#FF9900'
  return '#92D050'
}

export function neboshRiskBandTextColor(band: Exclude<NeboshRiskBand, ''>): string {
  if (band === 'high' || band === 'medium' || band === 'low') return '#FFFFFF'
  return '#000000'
}
