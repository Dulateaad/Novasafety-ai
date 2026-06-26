import { ABR_CONTROLS, ABR_HAZARDS } from '../config/abrCatalog'
import type { AbrForm, AbrStageRow } from '../types/abr'
import type { AsorForm, AsorHazardRow } from '../types/asor'
import type { PprForm } from '../types/ppr'

const ABR_STAGE_PRESETS: Array<{ hazardNumbers: number[]; controlNumbers: number[] }> = [
  { hazardNumbers: [19, 7], controlNumbers: [7, 18, 48] },
  { hazardNumbers: [6, 46], controlNumbers: [18, 27, 31] },
  { hazardNumbers: [52, 46], controlNumbers: [18, 26, 50] },
  { hazardNumbers: [4, 6], controlNumbers: [26, 27, 51] },
]

/** Есть ли в строке опасности содержимое для PDF и проверки готовности. */
export function hazardRowHasContent(h: AsorHazardRow): boolean {
  return Boolean(
    h.factorDescription.trim() ||
      h.protectiveMeasures.trim() ||
      h.operationText.trim(),
  )
}

function inferAbrNumbersFromText(text: string): {
  hazardNumbers: number[]
  controlNumbers: number[]
} {
  const lower = text.toLowerCase()
  const hazardNumbers: number[] = []
  const controlNumbers: number[] = []

  for (const h of ABR_HAZARDS) {
    const key = h.text.toLowerCase().slice(0, Math.min(24, h.text.length))
    if (key.length >= 8 && lower.includes(key)) hazardNumbers.push(h.no)
  }
  for (const c of ABR_CONTROLS) {
    const key = c.text.toLowerCase().slice(0, Math.min(20, c.text.length))
    if (key.length >= 8 && lower.includes(key)) controlNumbers.push(c.no)
  }

  if (/газ|воздух|кислород|загаз|атмосфер/.test(lower)) hazardNumbers.push(19)
  if (/давлен|трубопровод|манометр|сброс/.test(lower)) hazardNumbers.push(46, 52)
  if (/огн|пожар|взрыв|плам/.test(lower)) hazardNumbers.push(7)
  if (/паден|высот|лестниц/.test(lower)) hazardNumbers.push(4)
  if (/электр|напряжен/.test(lower)) hazardNumbers.push(35, 38)

  if (controlNumbers.length === 0) {
    if (/loto|блокиров|изоляц/.test(lower)) controlNumbers.push(18)
    if (/газоанализ|мониторинг/.test(lower)) controlNumbers.push(7)
    if (/сизод|респиратор|дыхани/.test(lower)) controlNumbers.push(48)
    if (/сигнал|наблюдат|огражден/.test(lower)) controlNumbers.push(27, 26)
  }

  if (hazardNumbers.length === 0) hazardNumbers.push(6, 19)
  if (controlNumbers.length === 0) controlNumbers.push(18, 7, 48)

  return {
    hazardNumbers: [...new Set(hazardNumbers)].slice(0, 8),
    controlNumbers: [...new Set(controlNumbers)].slice(0, 10),
  }
}

function pprContextText(ppr?: PprForm): string {
  if (!ppr) return ''
  return [
    ppr.workTitle,
    ppr.workDescription,
    ppr.workStagesText,
    ppr.toolsAndEquipment,
    ...(ppr.controlMeasures?.items.map(
      (item) =>
        `${item.section} ${item.hazard} ${item.controlMeasures.join(' ')}`,
    ) ?? []),
  ]
    .filter(Boolean)
    .join('\n')
}

function normalizeAbrStage(stage: AbrStageRow, index: number, ppr?: PprForm): AbrStageRow {
  if (stage.hazardNumbers.length > 0 || stage.controlNumbers.length > 0) return stage
  const inferred = inferAbrNumbersFromText(`${stage.title}\n${pprContextText(ppr)}`)
  const preset = ABR_STAGE_PRESETS[index % ABR_STAGE_PRESETS.length]
  return {
    ...stage,
    hazardNumbers:
      inferred.hazardNumbers.length > 0 ? inferred.hazardNumbers : preset.hazardNumbers,
    controlNumbers:
      inferred.controlNumbers.length > 0 ? inferred.controlNumbers : preset.controlNumbers,
  }
}

/** Подставляет номера опасностей/мер, если ИИ вернул только заголовки этапов. */
export function normalizeAbrStagesForReady(abr: AbrForm, ppr?: PprForm): AbrForm {
  if (!abr.stages.length) return abr
  return {
    ...abr,
    stages: abr.stages.map((stage, index) => normalizeAbrStage(stage, index, ppr)),
  }
}

function finalizeHazardRow(h: AsorHazardRow, taskTitle: string): AsorHazardRow {
  const factorDescription =
    h.factorDescription.trim() ||
    h.protectiveMeasures.trim().split('\n')[0]?.replace(/^•\s*/, '') ||
    h.operationText.trim() ||
    taskTitle.trim()
  return {
    ...h,
    operationText: h.operationText.trim() || taskTitle.trim(),
    factorDescription,
  }
}

/** Заполняет factorDescription из мер защиты, если ИИ оставил поле пустым. */
export function finalizeNeboshTasksForReady(form: AsorForm): AsorForm {
  if (form.tasks.length === 0) return form
  return {
    ...form,
    tasks: form.tasks.map((task) => ({
      ...task,
      hazards: task.hazards
        .map((h) => finalizeHazardRow(h, task.taskTitle))
        .filter(hazardRowHasContent),
    })),
  }
}

export function finalizeAsorFormForReady(form: AsorForm, ppr?: PprForm): AsorForm {
  let next = finalizeNeboshTasksForReady(form)
  if (next.abr?.stages.length) {
    next = { ...next, abr: normalizeAbrStagesForReady(next.abr, ppr) }
  }
  return next
}

export function canPreviewAbr(form: AsorForm): boolean {
  return Boolean(form.abr?.stages.some((s) => s.title.trim()))
}

export function canPreviewNebosh(form: AsorForm): boolean {
  return form.tasks.some((t) => t.hazards.some(hazardRowHasContent))
}
