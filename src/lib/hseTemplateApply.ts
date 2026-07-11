import {
  HSE_ACTIVITY_TEMPLATES,
  type HseActivityCategory,
} from '../config/hseActivityTemplates'
import type { AsorForm } from '../types/asor'
import { emptyHazard, emptyTask } from '../types/asor'

/** Применяет выбранные шаблоны к заданиям раздела 2 формы. */
export function applyHseTemplateSelection(
  form: AsorForm,
  templateIds: string[],
): AsorForm {
  const selected = HSE_ACTIVITY_TEMPLATES.filter((t) => templateIds.includes(t.id))
  if (selected.length === 0) {
    return { ...form, selectedHseTemplateIds: [] }
  }

  const tasks = selected.map((t, i) => ({
    ...emptyTask(i + 1),
    taskTitle: t.title,
    hazards: [
      {
        ...emptyHazard(),
        ordinal: 1,
        factorDescription: t.hazard,
        protectiveMeasures: t.measures.map((m, j) => `${j + 1}. ${m}`).join('\n'),
      },
    ],
  }))

  return {
    ...form,
    selectedHseTemplateIds: templateIds,
    tasks,
  }
}

export function countSelectedByCategory(
  templateIds: string[],
  category: HseActivityCategory,
): number {
  return templateIds.filter((id) =>
    HSE_ACTIVITY_TEMPLATES.some((t) => t.id === id && t.category === category),
  ).length
}
