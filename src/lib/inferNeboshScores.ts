import type { NeboshScaleValue } from '../config/neboshRiskMatrix'

function clampScore(n: number): NeboshScaleValue {
  if (n <= 1) return 1
  if (n >= 5) return 5
  return n as NeboshScaleValue
}

/** Эвристика исходного/остаточного риска по тексту опасности и мер (как в NEBOSH RA). */
export function inferNeboshScores(
  hazardText: string,
  measuresText: string,
): {
  initialLikelihood: NeboshScaleValue
  initialSeverity: NeboshScaleValue
  residualLikelihood: NeboshScaleValue
  residualSeverity: NeboshScaleValue
} {
  const h = hazardText.toLowerCase()
  let initialL = 3
  let initialS = 3

  if (/взрыв|пожар|неконтролируем|h2s|смерт|катастроф/i.test(h)) {
    initialL = 5
    initialS = 5
  } else if (/газ|давлен|утечк|выброс|углеводород/i.test(h)) {
    initialL = 4
    initialS = 5
  } else if (/паден|разлив|асфикс|отравлен|line of fire/i.test(h)) {
    initialL = 3
    initialS = 4
  } else if (/травм|порез|скольз|загрязнен/i.test(h)) {
    initialL = 3
    initialS = 3
  }

  const m = measuresText.toLowerCase()
  let residualL = Math.max(1, initialL - 2)
  let residualS = Math.max(1, initialS - 1)
  if (/scba|сиозод|газоанализ|наряд-допуск|леl|эвакуац/i.test(m)) {
    residualL = Math.min(residualL, 2)
  }
  if (/spill kit|ларн|line of fire|манометр|предохранительн/i.test(m)) {
    residualS = Math.min(residualS, 4)
  }

  return {
    initialLikelihood: clampScore(initialL),
    initialSeverity: clampScore(initialS),
    residualLikelihood: clampScore(residualL),
    residualSeverity: clampScore(residualS),
  }
}
