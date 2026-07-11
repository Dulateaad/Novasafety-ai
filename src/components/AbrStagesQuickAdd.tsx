import { AddPlusButton } from './AddPlusButton'
import { addAbrStage } from '../lib/abrStageListEdit'
import type { AbrForm } from '../types/abr'

export function AbrStagesQuickAdd(props: {
  abr: AbrForm
  onChange: (abr: AbrForm) => void
}) {
  const { abr, onChange } = props

  if (abr.stages.length === 0) {
    return (
      <div className="quick-add-list">
        <AddPlusButton
          onClick={() => onChange(addAbrStage(abr))}
          label="Добавить этап"
        />
      </div>
    )
  }

  return (
    <div className="quick-add-list">
      {abr.stages.map((stage, index) => (
        <div key={`stage-quick-${index}`} className="quick-add-item">
          <p className="quick-add-item__title">
            Этап {stage.order}
            {stage.title.trim() ? `: ${stage.title}` : ''}
          </p>
          <AddPlusButton
            onClick={() => onChange(addAbrStage(abr, index))}
            label="Добавить этап"
          />
        </div>
      ))}
    </div>
  )
}
