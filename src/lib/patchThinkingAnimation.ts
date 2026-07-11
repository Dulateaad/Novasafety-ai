const LOGO_SCALE_FACTOR = 1.785
const REMOVED_LAYER_INDS = new Set([1, 2, 3, 20])
/** Центр PNG-лого в ассете 229×312. */
const LOGO_ANCHOR = [114.5, 156, 0] as const
/** Центр холста Lottie 400×400, X чуть левее геометрического центра. */
const LOGO_POSITION = [192, 200, 0] as const
/** Исходная «плавающая» анимация Y (246–250) относительно 248. */
const LOGO_FLOAT_MID_Y = 248
type ScaleKeyframe = { s: number[]; t?: number; [key: string]: unknown }
type PositionKeyframe = { s: number[]; t?: number; [key: string]: unknown }
type LottieLayer = {
  ind?: number
  refId?: string
  ks?: {
    a?: { a?: number; k?: number[] }
    p?: {
      a?: number
      k?: number[] | PositionKeyframe[]
    }
    s?: {
      a?: number
      k?: number[] | ScaleKeyframe[]
    }
  }
}

function scaleValue(value: number, index: number): number {
  return index < 2 ? value * LOGO_SCALE_FACTOR : value
}

function scaleLogoKeyframes(
  keyframes: number[] | ScaleKeyframe[],
): number[] | ScaleKeyframe[] {
  if (keyframes.length === 0) return keyframes
  if (typeof keyframes[0] === 'number') {
    return (keyframes as number[]).map(scaleValue)
  }
  return (keyframes as ScaleKeyframe[]).map((frame) => ({
    ...frame,
    s: frame.s.map(scaleValue),
  }))
}

function centerLogoPosition(
  keyframes: number[] | PositionKeyframe[],
): number[] | PositionKeyframe[] {
  if (keyframes.length === 0) return [...LOGO_POSITION]
  if (typeof keyframes[0] === 'number') {
    return [...LOGO_POSITION]
  }
  return (keyframes as PositionKeyframe[]).map((frame) => {
    const sourceY = frame.s?.[1] ?? LOGO_FLOAT_MID_Y
    const floatOffset = sourceY - LOGO_FLOAT_MID_Y
    return {
      ...frame,
      s: [LOGO_POSITION[0], LOGO_POSITION[1] + floatOffset, LOGO_POSITION[2]],
    }
  })
}

function patchLogoLayer(layer: LottieLayer): LottieLayer {
  if (layer.refId !== 'logo' && layer.ind !== 10) return layer
  const ks = layer.ks
  const scale = ks?.s
  if (!ks || !scale?.k) return layer

  return {
    ...layer,
    ks: {
      ...ks,
      a: { a: 0, k: [...LOGO_ANCHOR] },
      p: ks.p
        ? {
            ...ks.p,
            k: centerLogoPosition(ks.p.k ?? [...LOGO_POSITION]),
          }
        : { a: 0, k: [...LOGO_POSITION] },
      s: {
        ...scale,
        k: scaleLogoKeyframes(scale.k),
      },
    },
  }
}

/** Убирает фон, точки «мысли» и центрирует логотип бота. */
export function patchThinkingAnimation(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const layers = data.layers as LottieLayer[] | undefined
  if (!layers?.length) return data

  return {
    ...data,
    layers: layers
      .filter((layer) => !REMOVED_LAYER_INDS.has(layer.ind ?? -1))
      .map(patchLogoLayer),
  }
}
