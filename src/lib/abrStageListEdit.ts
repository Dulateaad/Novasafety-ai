import type { AbrForm } from '../types/abr'

function renumberStages(stages: AbrForm['stages']): AbrForm['stages'] {
  return stages.map((s, i) => ({ ...s, order: i + 1 }))
}

function newStage(order: number): AbrForm['stages'][number] {
  return { id: crypto.randomUUID(), order, title: '', hazardNumbers: [], controlNumbers: [] }
}

export function addAbrStage(abr: AbrForm, afterIndex?: number): AbrForm {
  if (afterIndex === undefined) {
    return {
      ...abr,
      stages: renumberStages([...abr.stages, newStage(abr.stages.length + 1)]),
    }
  }
  const stages = [...abr.stages]
  stages.splice(afterIndex + 1, 0, newStage(afterIndex + 2))
  return { ...abr, stages: renumberStages(stages) }
}

export function removeAbrStage(abr: AbrForm, index: number): AbrForm {
  return {
    ...abr,
    stages: renumberStages(abr.stages.filter((_, i) => i !== index)),
  }
}
