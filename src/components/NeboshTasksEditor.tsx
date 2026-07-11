import {
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

export function NeboshTasksEditor(props: {
  form: AsorForm
  onChange: (form: AsorForm) => void
}) {
  const { form, onChange } = props

  function setTasks(tasks: AsorTaskBlock[]) {
    onChange({ ...form, tasks: renumberTasks(tasks) })
  }

  function patchTask(taskIndex: number, partial: Partial<AsorTaskBlock>) {
    setTasks(form.tasks.map((t, i) => (i === taskIndex ? { ...t, ...partial } : t)))
  }

  function addTask() {
    setTasks([...form.tasks, newTask(form.tasks.length + 1)])
  }

  function addTaskAfter(taskIndex: number) {
    const tasks = [...form.tasks]
    tasks.splice(taskIndex + 1, 0, newTask(taskIndex + 2))
    setTasks(tasks)
  }

  function removeTask(taskId: string) {
    setTasks(form.tasks.filter((t) => t.id !== taskId))
  }

  function patchHazard(
    taskIndex: number,
    hazardIndex: number,
    partial: Partial<AsorHazardRow>,
  ) {
    setTasks(
      form.tasks.map((t, ti) => {
        if (ti !== taskIndex) return t
        return {
          ...t,
          hazards: t.hazards.map((h, hi) => (hi === hazardIndex ? { ...h, ...partial } : h)),
        }
      }),
    )
  }

  return (
    <div className="form" style={{ marginTop: '0.85rem' }}>
      <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="btn ghost small" onClick={addTask}>
          + Добавить задание
        </button>
      </div>

      {form.tasks.length === 0 && (
        <p className="small muted" style={{ marginTop: 0 }}>
          Нет заданий — нажмите «Сформировать оценку риска» или добавьте задание вручную.
        </p>
      )}

      {form.tasks.map((task, taskIndex) => (
        <fieldset key={task.id} className="fieldset">
          <legend>Задание {task.ordinal}</legend>
          <label>
            Название задания
            <input
              value={task.taskTitle}
              onChange={(e) => patchTask(taskIndex, { taskTitle: e.target.value })}
            />
          </label>
          {task.hazards.map((hazard, hazardIndex) => (
            <div
              key={hazard.id}
              className="card"
              style={{ padding: '0.65rem 0.85rem', marginTop: '0.5rem' }}
            >
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                Опасность {hazard.ordinal}
              </p>
              <label>
                Операция
                <input
                  value={hazard.operationText}
                  onChange={(e) =>
                    patchHazard(taskIndex, hazardIndex, { operationText: e.target.value })
                  }
                />
              </label>
              <label>
                Опасность / угроза
                <textarea
                  rows={2}
                  value={hazard.factorDescription}
                  onChange={(e) =>
                    patchHazard(taskIndex, hazardIndex, {
                      factorDescription: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Кто под угрозой
                <input
                  value={hazard.whoAtRisk}
                  onChange={(e) =>
                    patchHazard(taskIndex, hazardIndex, { whoAtRisk: e.target.value })
                  }
                />
              </label>
              <label>
                Меры контроля
                <textarea
                  rows={3}
                  value={hazard.protectiveMeasures}
                  onChange={(e) =>
                    patchHazard(taskIndex, hazardIndex, {
                      protectiveMeasures: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Ответственный
                <input
                  value={hazard.responsiblePerson}
                  onChange={(e) =>
                    patchHazard(taskIndex, hazardIndex, {
                      responsiblePerson: e.target.value,
                    })
                  }
                />
              </label>
            </div>
          ))}
          <div className="btn-row" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => removeTask(task.id)}
            >
              Удалить задание
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => addTaskAfter(taskIndex)}
            >
              + Добавить задание
            </button>
          </div>
        </fieldset>
      ))}
    </div>
  )
}
