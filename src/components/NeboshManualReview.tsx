import { AddPlusButton } from './AddPlusButton'
import {
  addNeboshTask,
  patchNeboshTask,
  removeNeboshTask,
} from '../lib/neboshTaskListEdit'
import {
  emptyPersonRow,
  type AsorForm,
  type AsorHazardRow,
} from '../types/asor'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'

export function NeboshManualReview(props: {
  form: AsorForm
  onChange: (form: AsorForm) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { form, onChange, open, onOpenChange } = props
  const nb = form.nebosh

  const { t } = useLanguage()
  const mr = t.manualReview
  const mrf = t.manualReviewForm

  function setTasks(nextForm: AsorForm) {
    onChange(nextForm)
  }

  function patchNebosh(partial: Partial<typeof nb>) {
    onChange({ ...form, nebosh: { ...nb, ...partial } })
  }

  function patchTask(taskIndex: number, partial: Parameters<typeof patchNeboshTask>[2]) {
    setTasks(patchNeboshTask(form, taskIndex, partial))
  }

  function addTask() {
    setTasks(addNeboshTask(form))
  }

  function addTaskAfter(taskIndex: number) {
    setTasks(addNeboshTask(form, taskIndex))
  }

  function removeTask(taskId: string) {
    setTasks(removeNeboshTask(form, taskId))
  }

  function patchHazard(
    taskIndex: number,
    hazardIndex: number,
    partial: Partial<AsorHazardRow>,
  ) {
    onChange({
      ...form,
      tasks: form.tasks.map((t, ti) => {
        if (ti !== taskIndex) return t
        return {
          ...t,
          hazards: t.hazards.map((h, hi) => (hi === hazardIndex ? { ...h, ...partial } : h)),
        }
      }),
    })
  }

  return (
    <details className="card" open={open} style={{ marginTop: '0.85rem' }}>
      <summary
        style={{ cursor: 'pointer', fontWeight: 600 }}
        onClick={(e) => {
          e.preventDefault()
          onOpenChange(!open)
        }}
      >
        {mrf.riskTitle}
      </summary>
      <p className="muted xsmall" style={{ marginTop: '0.65rem' }}>
        {mrf.riskHint}
      </p>
      <div className="form" style={{ marginTop: '0.75rem' }}>
        <div className="row">
          <label>
            {mrf.siteObject}
            <input
              value={nb.siteObject}
              onChange={(e) => patchNebosh({ siteObject: e.target.value })}
            />
          </label>
          <label>
            {mrf.assessmentDate}
            <input
              type="date"
              value={nb.assessmentDateIso || form.creationDateIso}
              onChange={(e) => patchNebosh({ assessmentDateIso: e.target.value })}
            />
          </label>
        </div>
        <div className="row">
          <label>
            {mrf.contractorOrg}
            <input
              value={nb.contractorOrg}
              onChange={(e) => patchNebosh({ contractorOrg: e.target.value })}
            />
          </label>
          <label>
            {mrf.preparedBy}
            <input
              value={nb.preparedBy}
              onChange={(e) => patchNebosh({ preparedBy: e.target.value })}
            />
          </label>
        </div>

        {form.tasks.length === 0 && (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              {mrf.noTasks}
            </p>
            <AddPlusButton onClick={addTask} label={mr.addTask} />
          </>
        )}

        {form.tasks.map((task, taskIndex) => (
          <fieldset key={task.id} className="fieldset">
            <legend>{fillTemplate(mrf.taskLegend, { ordinal: task.ordinal })}</legend>
            <label>
              {mrf.taskTitle}
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
                  {fillTemplate(mrf.hazardLegend, { ordinal: hazard.ordinal })}
                </p>
                <label>
                  {mrf.operation}
                  <input
                    value={hazard.operationText}
                    onChange={(e) =>
                      patchHazard(taskIndex, hazardIndex, { operationText: e.target.value })
                    }
                  />
                </label>
                <label>
                  {mrf.hazardThreat}
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
                  {mrf.whoAtRisk}
                  <input
                    value={hazard.whoAtRisk}
                    onChange={(e) =>
                      patchHazard(taskIndex, hazardIndex, { whoAtRisk: e.target.value })
                    }
                  />
                </label>
                <label>
                  {mrf.controlMeasures}
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
                  {mrf.responsible}
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
            <button
              type="button"
              className="btn ghost small"
              style={{ marginTop: '0.5rem' }}
              onClick={() => removeTask(task.id)}
            >
              {mrf.removeTask}
            </button>
            <AddPlusButton
              onClick={() => addTaskAfter(taskIndex)}
              label={mr.addTask}
            />
          </fieldset>
        ))}

        <fieldset className="fieldset">
          <legend>{mrf.crewNdprLegend}</legend>
          {(form.declarationTeamRows.length > 0
            ? form.declarationTeamRows
            : [{ ...emptyPersonRow(), rolePrinted: mr.worker }]
          ).map((person, index) => (
            <div key={`crew-${index}`} style={{ marginBottom: '0.75rem' }}>
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                {mr.worker} {index + 1}
              </p>
              <label>
                {mrf.fullName}
                <input
                  value={person.fullNamePrinted}
                  onChange={(e) => {
                    const declarationTeamRows = [...form.declarationTeamRows]
                    while (declarationTeamRows.length <= index) {
                      declarationTeamRows.push({
                        ...emptyPersonRow(),
                        rolePrinted: mr.worker,
                      })
                    }
                    declarationTeamRows[index] = {
                      ...declarationTeamRows[index],
                      fullNamePrinted: e.target.value,
                    }
                    onChange({ ...form, declarationTeamRows })
                  }}
                />
              </label>
              <label>
                {mrf.badgeNo}
                <input
                  value={person.badgeNo}
                  onChange={(e) => {
                    const declarationTeamRows = [...form.declarationTeamRows]
                    while (declarationTeamRows.length <= index) {
                      declarationTeamRows.push({
                        ...emptyPersonRow(),
                        rolePrinted: mr.worker,
                      })
                    }
                    declarationTeamRows[index] = {
                      ...declarationTeamRows[index],
                      badgeNo: e.target.value,
                    }
                    onChange({ ...form, declarationTeamRows })
                  }}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <fieldset className="fieldset">
          <legend>{mrf.signaturesLegend}</legend>
          {(nb.signatureRows.length >= 4
            ? nb.signatureRows.slice(0, 4)
            : [
                { role: mr.performer, fullName: nb.preparedBy, dateIso: nb.assessmentDateIso || form.creationDateIso },
                { role: mr.permitter, fullName: '', dateIso: '' },
                { role: mr.issuer, fullName: '', dateIso: '' },
                { role: mr.leadExpert, fullName: nb.approvedBy, dateIso: '' },
              ]
          ).map((row, index) => (
            <div key={`sig-${index}`} style={{ marginBottom: '0.75rem' }}>
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                {index + 1}. {row.role}
              </p>
              <label>
                {mrf.fullName}
                <input
                  value={row.fullName}
                  onChange={(e) => {
                    const signatureRows = [...nb.signatureRows]
                    while (signatureRows.length < 4) {
                      signatureRows.push({ role: '', fullName: '', dateIso: '' })
                    }
                    signatureRows[index] = { ...signatureRows[index], fullName: e.target.value }
                    patchNebosh({ signatureRows })
                  }}
                />
              </label>
            </div>
          ))}
        </fieldset>
      </div>
    </details>
  )
}
