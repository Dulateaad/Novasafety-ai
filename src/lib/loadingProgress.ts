import { APP_NAME } from '../config/branding'
import type { PprExtractStage } from './extractPprControlMeasures'

export function pprExtractProgressPercent(stage: PprExtractStage | null): number {
  switch (stage) {
    case 'reading':
      return 25
    case 'gemini':
      return 60
    case 'rules':
      return 82
    case 'pdf':
      return 95
    default:
      return 12
  }
}

/** Верхняя граница «ползущего» прогресса, пока этап ещё выполняется */
export function pprExtractProgressCeiling(stage: PprExtractStage | null): number {
  switch (stage) {
    case 'reading':
      return 38
    case 'gemini':
      return 88
    case 'rules':
      return 93
    case 'pdf':
      return 99
    default:
      return 22
  }
}

export function pprExtractProgressLabel(stage: PprExtractStage | null): string {
  switch (stage) {
    case 'reading':
      return 'Чтение документа…'
    case 'gemini':
      return `${APP_NAME} анализирует…`
    case 'rules':
      return 'Подбор по правилам…'
    case 'pdf':
      return 'Формирование PDF…'
    default:
      return 'Обработка документа…'
  }
}
