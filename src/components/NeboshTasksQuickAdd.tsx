import { AddPlusButton } from './AddPlusButton'
import { addNeboshTask } from '../lib/neboshTaskListEdit'
import type { AsorForm } from '../types/asor'

export function NeboshTasksQuickAdd(props: {
  form: AsorForm
  onChange: (form: AsorForm) => void
}) {
  const { form, onChange } = props

  if (form.tasks.length === 0) {
    return (
      <div className="quick-add-list">
        <AddPlusButton
          onClick={() => onChange(addNeboshTask(form))}
          label="Добавить задание"
        />
      </div>
    )
  }

  return (
    <div className="quick-add-list">
      {form.tasks.map((task, index) => (
        <div key={task.id} className="quick-add-item">
          <p className="quick-add-item__title">
            Задание {task.ordinal}
            {task.taskTitle.trim() ? `: ${task.taskTitle}` : ''}
          </p>
          <AddPlusButton
            onClick={() => onChange(addNeboshTask(form, index))}
            label="Добавить задание"
          />
        </div>
      ))}
    </div>
  )
}
