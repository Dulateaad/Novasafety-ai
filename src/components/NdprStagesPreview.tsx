import type { PprTaskBlock } from '../types/ppr'
import { stripStageNumbering } from '../lib/pprNdprExtract'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'

/** Этапы работ с описанием каждого (из ППР / Claude). */
export function NdprStagesPreview(props: { tasks: PprTaskBlock[] }) {
  const { t } = useLanguage()
  const rows = props.tasks.filter((task) => task.taskTitle.trim() || task.workContent.trim())
  if (rows.length === 0) return null

  return (
    <div className="ndpr-stages-preview">
      {rows.map((task, i) => (
        <div key={task.id || i} className="ndpr-stages-preview__item">
          <div className="strong small" style={{ marginBottom: '0.25rem' }}>
            {stripStageNumbering(task.taskTitle.trim()) ||
              fillTemplate(t.stages.stageN, { n: task.ordinal || i + 1 })}
          </div>
          {task.workContent.trim() && (
            <p className="muted small" style={{ margin: '0 0 0.65rem', whiteSpace: 'pre-wrap' }}>
              {task.workContent.trim()}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
