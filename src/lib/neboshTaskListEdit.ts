import {
  emptyHazard,
  emptyTask,
  type AsorForm,
  type AsorHazardRow,
  type AsorTaskBlock,
} from '../types/asor'

function isGenericTaskTitle(title: string): boolean {
  const t = title.trim()
  return /^Задание\s+\d+\s*$/i.test(t) || /^Группа\s+\d+\s*$/i.test(t)
}

function renumberTasks(tasks: AsorTaskBlock[]): AsorTaskBlock[] {
  return tasks.map((t, i) => ({
    ...t,
    ordinal: i + 1,
    taskTitle: isGenericTaskTitle(t.taskTitle) ? `Задание ${i + 1}` : t.taskTitle,
  }))
}

function newTask(order: number): AsorTaskBlock {
  return { ...emptyTask(order), taskTitle: `Задание ${order}` }
}

export function addNeboshTask(form: AsorForm, afterIndex?: number): AsorForm {
  if (afterIndex === undefined) {
    return {
      ...form,
      tasks: renumberTasks([...form.tasks, newTask(form.tasks.length + 1)]),
    }
  }
  const tasks = [...form.tasks]
  tasks.splice(afterIndex + 1, 0, newTask(afterIndex + 2))
  return { ...form, tasks: renumberTasks(tasks) }
}

export function removeNeboshTask(form: AsorForm, taskId: string): AsorForm {
  return { ...form, tasks: renumberTasks(form.tasks.filter((t) => t.id !== taskId)) }
}

export function patchNeboshTask(
  form: AsorForm,
  taskIndex: number,
  partial: Partial<AsorTaskBlock>,
): AsorForm {
  return {
    ...form,
    tasks: renumberTasks(
      form.tasks.map((t, i) => (i === taskIndex ? { ...t, ...partial } : t)),
    ),
  }
}

function renumberHazards(hazards: AsorHazardRow[]): AsorHazardRow[] {
  return hazards.map((h, i) => ({ ...h, ordinal: i + 1 }))
}

export function addNeboshHazard(form: AsorForm, taskIndex: number): AsorForm {
  return {
    ...form,
    tasks: form.tasks.map((t, ti) => {
      if (ti !== taskIndex) return t
      return {
        ...t,
        hazards: renumberHazards([...t.hazards, emptyHazard()]),
      }
    }),
  }
}

export function removeNeboshHazard(
  form: AsorForm,
  taskIndex: number,
  hazardId: string,
): AsorForm {
  return {
    ...form,
    tasks: form.tasks.map((t, ti) => {
      if (ti !== taskIndex) return t
      const next = t.hazards.filter((h) => h.id !== hazardId)
      return {
        ...t,
        hazards: renumberHazards(next.length > 0 ? next : [emptyHazard()]),
      }
    }),
  }
}

export { renumberTasks }
