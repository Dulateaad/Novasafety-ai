import { AddPlusButton } from './AddPlusButton'
import { addAbrStage, removeAbrStage } from '../lib/abrStageListEdit'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'
import type { AbrForm, AbrStageRow } from '../types/abr'

function parseNumList(raw: string): number[] {
  return raw
    .split(/[,;\s]+/)
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 58)
}

function formatNumList(nums: number[]): string {
  return nums.join(', ')
}

export function AbrManualReview(props: {
  abr: AbrForm
  onChange: (abr: AbrForm) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { abr, onChange, open, onOpenChange } = props

  const { t } = useLanguage()
  const mr = t.manualReview
  const mrf = t.manualReviewForm
  const b = t.branding
  const generateAbrLabel = fillTemplate(t.riskPage.generateAbr, { abr: b.abr })

  function patch(partial: Partial<AbrForm>) {
    onChange({ ...abr, ...partial })
  }

  function patchStage(index: number, partial: Partial<AbrStageRow>) {
    const stages = abr.stages.map((s, i) => (i === index ? { ...s, ...partial } : s))
    onChange({ ...abr, stages })
  }

  function addStage() {
    onChange(addAbrStage(abr))
  }

  function addStageAfter(index: number) {
    onChange(addAbrStage(abr, index))
  }

  function removeStage(index: number) {
    onChange(removeAbrStage(abr, index))
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
        {fillTemplate(mrf.abrTitle, { abr: b.abr })}
      </summary>
      <p className="muted xsmall" style={{ marginTop: '0.65rem' }}>
        {mrf.abrHint}
      </p>
      <div className="form" style={{ marginTop: '0.75rem' }}>
        <label>
          {mrf.workLocation}
          <input
            value={abr.workLocation}
            onChange={(e) => patch({ workLocation: e.target.value })}
          />
        </label>
        <div className="row">
          <label>
            {mrf.permitNo}
            <input
              value={abr.permitNo}
              onChange={(e) => patch({ permitNo: e.target.value })}
            />
          </label>
          <label>
            {mrf.date}
            <input
              type="date"
              value={abr.dateIso}
              onChange={(e) => patch({ dateIso: e.target.value })}
            />
          </label>
        </div>
        <div className="btn-row" style={{ gap: '1rem' }}>
          <label className="check">
            <input
              type="checkbox"
              checked={abr.shiftDay}
              onChange={(e) => patch({ shiftDay: e.target.checked })}
            />
            {mrf.shiftDay}
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={abr.shiftNight}
              onChange={(e) => patch({ shiftNight: e.target.checked })}
            />
            {mrf.shiftNight}
          </label>
        </div>
        <label>
          {mrf.jobDescription}
          <textarea
            rows={3}
            value={abr.jobDescription}
            onChange={(e) => patch({ jobDescription: e.target.value })}
          />
        </label>

        {abr.stages.length === 0 && (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              {fillTemplate(mrf.noStages, { generateAbr: generateAbrLabel })}
            </p>
            <AddPlusButton onClick={addStage} label={mr.addStage} />
          </>
        )}

        {abr.stages.map((stage, index) => (
          <fieldset key={`stage-${index}`} className="fieldset">
            <legend>
              {fillTemplate(mrf.stageLegend, {
                order: stage.order,
                title:
                  stage.title.slice(0, 60) + (stage.title.length > 60 ? '…' : ''),
              })}
            </legend>
            <label>
              {mrf.stageTitle}
              <input
                value={stage.title}
                onChange={(e) => patchStage(index, { title: e.target.value })}
              />
            </label>
            <label>
              {mrf.hazardNumbers}
              <input
                value={formatNumList(stage.hazardNumbers)}
                onChange={(e) =>
                  patchStage(index, { hazardNumbers: parseNumList(e.target.value) })
                }
                placeholder="7, 19, 46"
              />
            </label>
            <label>
              {mrf.controlNumbers}
              <input
                value={formatNumList(stage.controlNumbers)}
                onChange={(e) =>
                  patchStage(index, { controlNumbers: parseNumList(e.target.value) })
                }
                placeholder="18, 27, 46"
              />
            </label>
            <button
              type="button"
              className="btn ghost small"
              style={{ marginTop: '0.5rem' }}
              onClick={() => removeStage(index)}
            >
              {mrf.removeStage}
            </button>
            <AddPlusButton
              onClick={() => addStageAfter(index)}
              label={mr.addStage}
            />
          </fieldset>
        ))}

        <fieldset className="fieldset">
          <legend>{mrf.briefingLegend}</legend>
          <label>
            {mrf.briefingTopHazards}
            <textarea
              rows={2}
              value={abr.briefing.topHazardsAndControls}
              onChange={(e) =>
                patch({
                  briefing: { ...abr.briefing, topHazardsAndControls: e.target.value },
                })
              }
            />
          </label>
          <label>
            {mrf.briefingStopScenarios}
            <textarea
              rows={2}
              value={abr.briefing.stopScenarios}
              onChange={(e) =>
                patch({ briefing: { ...abr.briefing, stopScenarios: e.target.value } })
              }
            />
          </label>
          <label>
            {mrf.briefingMorMentors}
            <textarea
              rows={2}
              value={abr.briefing.morMentors}
              onChange={(e) =>
                patch({ briefing: { ...abr.briefing, morMentors: e.target.value } })
              }
            />
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend>{mrf.crewAbrLegend}</legend>
          {(abr.crewAcknowledgments.length > 0
            ? abr.crewAcknowledgments
            : [{ fullName: '', badgeNo: '', roleLabel: mr.worker }]
          ).map((person, index) => (
            <div key={`crew-${index}`} style={{ marginBottom: '0.75rem' }}>
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                {mr.worker} {index + 1}
              </p>
              <label>
                {mrf.fullName}
                <input
                  value={person.fullName}
                  onChange={(e) => {
                    const crewAcknowledgments = [...abr.crewAcknowledgments]
                    while (crewAcknowledgments.length <= index) {
                      crewAcknowledgments.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: mr.worker,
                      })
                    }
                    crewAcknowledgments[index] = {
                      ...crewAcknowledgments[index],
                      fullName: e.target.value,
                    }
                    onChange({ ...abr, crewAcknowledgments })
                  }}
                />
              </label>
              <label>
                {mrf.badgeNo}
                <input
                  value={person.badgeNo}
                  onChange={(e) => {
                    const crewAcknowledgments = [...abr.crewAcknowledgments]
                    while (crewAcknowledgments.length <= index) {
                      crewAcknowledgments.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: mr.worker,
                      })
                    }
                    crewAcknowledgments[index] = {
                      ...crewAcknowledgments[index],
                      badgeNo: e.target.value,
                    }
                    onChange({ ...abr, crewAcknowledgments })
                  }}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <fieldset className="fieldset">
          <legend>{mrf.approvalLegend}</legend>
          {(abr.approvalSigners.length >= 4
            ? abr.approvalSigners.slice(0, 4)
            : [
                abr.workSupervisor,
                abr.areaPermitter,
                { fullName: '', badgeNo: '', roleLabel: mr.issuer },
                { fullName: '', badgeNo: '', roleLabel: mr.leadExpert },
              ]
          ).map((person, index) => (
            <div key={`approval-${index}`} style={{ marginBottom: '0.75rem' }}>
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                {index + 1}. {person.roleLabel}
              </p>
              <label>
                {mrf.fullName}
                <input
                  value={person.fullName}
                  onChange={(e) => {
                    const approvalSigners = [...abr.approvalSigners]
                    while (approvalSigners.length < 4) {
                      approvalSigners.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: [mr.performer, mr.permitter, mr.issuer, mr.leadExpert][approvalSigners.length] ?? '',
                      })
                    }
                    approvalSigners[index] = {
                      ...approvalSigners[index],
                      fullName: e.target.value,
                    }
                    onChange({ ...abr, approvalSigners })
                  }}
                />
              </label>
              <label>
                {mrf.badgeNo}
                <input
                  value={person.badgeNo}
                  onChange={(e) => {
                    const approvalSigners = [...abr.approvalSigners]
                    while (approvalSigners.length < 4) {
                      approvalSigners.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: [mr.performer, mr.permitter, mr.issuer, mr.leadExpert][approvalSigners.length] ?? '',
                      })
                    }
                    approvalSigners[index] = {
                      ...approvalSigners[index],
                      badgeNo: e.target.value,
                    }
                    onChange({ ...abr, approvalSigners })
                  }}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <fieldset className="fieldset">
          <legend>Бригада — ознакомление с АБР</legend>
          {(abr.crewAcknowledgments.length > 0
            ? abr.crewAcknowledgments
            : [{ fullName: '', badgeNo: '', roleLabel: mr.worker }]
          ).map((person, index) => (
            <div key={`crew-${index}`} style={{ marginBottom: '0.75rem' }}>
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                {mr.worker} {index + 1}
              </p>
              <label>
                Ф.И.О.
                <input
                  value={person.fullName}
                  onChange={(e) => {
                    const crewAcknowledgments = [...abr.crewAcknowledgments]
                    while (crewAcknowledgments.length <= index) {
                      crewAcknowledgments.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: mr.worker,
                      })
                    }
                    crewAcknowledgments[index] = {
                      ...crewAcknowledgments[index],
                      fullName: e.target.value,
                    }
                    onChange({ ...abr, crewAcknowledgments })
                  }}
                />
              </label>
              <label>
                № пропуска
                <input
                  value={person.badgeNo}
                  onChange={(e) => {
                    const crewAcknowledgments = [...abr.crewAcknowledgments]
                    while (crewAcknowledgments.length <= index) {
                      crewAcknowledgments.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: 'Работник',
                      })
                    }
                    crewAcknowledgments[index] = {
                      ...crewAcknowledgments[index],
                      badgeNo: e.target.value,
                    }
                    onChange({ ...abr, crewAcknowledgments })
                  }}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <fieldset className="fieldset">
          <legend>Участники согласования (4 роли из НДПР)</legend>
          {(abr.approvalSigners.length >= 4
            ? abr.approvalSigners.slice(0, 4)
            : [
                abr.workSupervisor,
                abr.areaPermitter,
                { fullName: '', badgeNo: '', roleLabel: mr.issuer },
                { fullName: '', badgeNo: '', roleLabel: mr.leadExpert },
              ]
          ).map((person, index) => (
            <div key={`approval-${index}`} style={{ marginBottom: '0.75rem' }}>
              <p className="strong small" style={{ margin: '0 0 0.35rem' }}>
                {index + 1}. {person.roleLabel}
              </p>
              <label>
                Ф.И.О.
                <input
                  value={person.fullName}
                  onChange={(e) => {
                    const approvalSigners = [...abr.approvalSigners]
                    while (approvalSigners.length < 4) {
                      approvalSigners.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: [mr.performer, mr.permitter, mr.issuer, mr.leadExpert][approvalSigners.length] ?? '',
                      })
                    }
                    approvalSigners[index] = {
                      ...approvalSigners[index],
                      fullName: e.target.value,
                    }
                    onChange({ ...abr, approvalSigners })
                  }}
                />
              </label>
              <label>
                № пропуска
                <input
                  value={person.badgeNo}
                  onChange={(e) => {
                    const approvalSigners = [...abr.approvalSigners]
                    while (approvalSigners.length < 4) {
                      approvalSigners.push({
                        fullName: '',
                        badgeNo: '',
                        roleLabel: ['Производитель работ', 'Допускающий', 'Выдающий НД', 'Утверждающий НД'][approvalSigners.length] ?? '',
                      })
                    }
                    approvalSigners[index] = {
                      ...approvalSigners[index],
                      badgeNo: e.target.value,
                    }
                    onChange({ ...abr, approvalSigners })
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
