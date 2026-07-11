import { AddPlusButton } from './AddPlusButton'
import {
  addNeboshHazard,
  addNeboshTask,
  patchNeboshTask,
  removeNeboshHazard,
  removeNeboshTask,
} from '../lib/neboshTaskListEdit'
import {
  NEBOSH_LIKELIHOOD_LABELS,
  NEBOSH_RISK_BAND_LABELS,
  NEBOSH_SEVERITY_LABELS,
  neboshBandToResidual,
  neboshCellColor,
  neboshCellTextColor,
  neboshRiskBand,
  neboshRiskScore,
  parseNeboshScale,
  type NeboshScaleValue,
} from '../config/neboshRiskMatrix'
import {
  emptyPersonRow,
  type AsorForm,
  type AsorHazardRow,
} from '../types/asor'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'

function ScaleSelect(props: {
  value: NeboshScaleValue
  labels: Record<Exclude<NeboshScaleValue, 0>, string>
  onChange: (value: NeboshScaleValue) => void
}) {
  const { value, labels, onChange } = props
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(parseNeboshScale(Number(e.target.value)))}
    >
      <option value="">—</option>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <option key={n} value={n}>
          {labels[n]}
        </option>
      ))}
    </select>
  )
}

export function NeboshManualReview(props: {
  form: AsorForm
  onChange: (form: AsorForm) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  embedded?: boolean
}) {
  const { form, onChange, open, onOpenChange, embedded = false } = props
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
          hazards: t.hazards.map((h, hi) => {
            if (hi !== hazardIndex) return h
            const next = { ...h, ...partial }
            const score = neboshRiskScore(next.initialLikelihood, next.initialSeverity)
            const band = neboshRiskBand(score)
            return {
              ...next,
              residualRisk: band ? neboshBandToResidual(band) : next.residualRisk,
            }
          }),
        }
      }),
    })
  }

  function addHazard(taskIndex: number) {
    onChange(addNeboshHazard(form, taskIndex))
  }

  function removeHazard(taskIndex: number, hazardId: string) {
    onChange(removeNeboshHazard(form, taskIndex, hazardId))
  }

  const panelBody = (
    <div className="manual-review-panel__body">
      <p className="muted xsmall" style={{ marginTop: 0 }}>
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
            {task.hazards.map((hazard, hazardIndex) => {
              const score = neboshRiskScore(hazard.initialLikelihood, hazard.initialSeverity)
              const band = neboshRiskBand(score)
              return (
              <div key={hazard.id} className="manual-review-hazard">
                <div className="manual-review-hazard__head">
                  <p className="strong small" style={{ margin: 0 }}>
                    {fillTemplate(mrf.hazardLegend, { ordinal: hazard.ordinal })}
                  </p>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => removeHazard(taskIndex, hazard.id)}
                  >
                    {mrf.removeHazard}
                  </button>
                </div>
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
                <div className="manual-review-risk-row">
                  <label>
                    {mrf.likelihood}
                    <ScaleSelect
                      value={hazard.initialLikelihood}
                      labels={NEBOSH_LIKELIHOOD_LABELS}
                      onChange={(initialLikelihood) =>
                        patchHazard(taskIndex, hazardIndex, { initialLikelihood })
                      }
                    />
                  </label>
                  <label>
                    {mrf.severity}
                    <ScaleSelect
                      value={hazard.initialSeverity}
                      labels={NEBOSH_SEVERITY_LABELS}
                      onChange={(initialSeverity) =>
                        patchHazard(taskIndex, hazardIndex, { initialSeverity })
                      }
                    />
                  </label>
                  <label>
                    {mrf.riskLevel}
                    <div
                      className={`manual-review-risk-badge${band ? '' : ' manual-review-risk-badge--empty'}`}
                      style={
                        band
                          ? {
                              background: neboshCellColor(score),
                              color: neboshCellTextColor(score),
                            }
                          : undefined
                      }
                    >
                      {band ? `${score} · ${NEBOSH_RISK_BAND_LABELS[band]}` : '—'}
                    </div>
                  </label>
                </div>
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
                <AddPlusButton
                  onClick={() => addHazard(taskIndex)}
                  label={mr.addHazard}
                />
              </div>
            )})}
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
                { role: mr.performer, fullName: '', dateIso: nb.assessmentDateIso || form.creationDateIso },
                { role: mr.permitter, fullName: '', dateIso: '' },
                { role: mr.issuer, fullName: '', dateIso: '' },
                { role: mr.leadExpert, fullName: '', dateIso: '' },
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
    </div>
  )

  if (embedded) {
    return (
      <details
        className="manual-review-panel manual-review-panel--embedded"
        open={open}
      >
        <summary
          onClick={(e) => {
            e.preventDefault()
            onOpenChange(!open)
          }}
        >
          {mrf.riskTitle}
        </summary>
        {panelBody}
      </details>
    )
  }

  return (
    <details
      className="manual-review-panel card"
      open={open}
      style={{ marginTop: '0.85rem' }}
    >
      <summary
        onClick={(e) => {
          e.preventDefault()
          onOpenChange(!open)
        }}
      >
        {mrf.riskTitle}
      </summary>
      {panelBody}
    </details>
  )
}
