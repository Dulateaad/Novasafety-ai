import { useState } from 'react'
import { AddPlusButton } from './AddPlusButton'
import { addAbrStage, removeAbrStage } from '../lib/abrStageListEdit'
import { useSession } from '../context/SessionContext'
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
  embedded?: boolean
}) {
  const { abr, onChange, open, onOpenChange, embedded = false } = props

  const { user } = useSession()
  const isProducer = user?.role === 'performer'
  const { t } = useLanguage()
  const mr = t.manualReview
  const mrf = t.manualReviewForm
  const b = t.branding
  const generateAbrLabel = fillTemplate(t.riskPage.generateAbr, { abr: b.abr })
  const [numDrafts, setNumDrafts] = useState<
    Record<string, { hazard?: string; control?: string }>
  >({})

  function getNumDraft(
    stageId: string,
    field: 'hazard' | 'control',
    nums: number[],
  ): string {
    const draft = numDrafts[stageId]?.[field]
    return draft !== undefined ? draft : formatNumList(nums)
  }

  function setNumDraft(stageId: string, field: 'hazard' | 'control', value: string) {
    setNumDrafts((prev) => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value },
    }))
  }

  function commitNumDraft(
    index: number,
    stage: AbrStageRow,
    field: 'hazard' | 'control',
  ) {
    const nums = field === 'hazard' ? stage.hazardNumbers : stage.controlNumbers
    const raw = numDrafts[stage.id]?.[field] ?? formatNumList(nums)
    patchStage(index, {
      [field === 'hazard' ? 'hazardNumbers' : 'controlNumbers']: parseNumList(raw),
    })
    setNumDrafts((prev) => {
      const entry = { ...prev[stage.id] }
      delete entry[field]
      const next = { ...prev }
      if (Object.keys(entry).length === 0) delete next[stage.id]
      else next[stage.id] = entry
      return next
    })
  }

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

  const titleText = fillTemplate(mrf.abrTitle, { abr: b.abr })
  const panelBody = (
    <div className="manual-review-panel__body">
      <p className="muted xsmall" style={{ marginTop: 0 }}>
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
                value={getNumDraft(stage.id, 'hazard', stage.hazardNumbers)}
                onChange={(e) => setNumDraft(stage.id, 'hazard', e.target.value)}
                onBlur={() => commitNumDraft(index, stage, 'hazard')}
                placeholder="7, 19, 46"
                inputMode="text"
                autoComplete="off"
              />
            </label>
            <label>
              {mrf.controlNumbers}
              <input
                value={getNumDraft(stage.id, 'control', stage.controlNumbers)}
                onChange={(e) => setNumDraft(stage.id, 'control', e.target.value)}
                onBlur={() => commitNumDraft(index, stage, 'control')}
                placeholder="18, 27, 46"
                inputMode="text"
                autoComplete="off"
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

        {!isProducer ? (
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
        ) : null}

        {!isProducer ? (
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
        ) : null}
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
          {titleText}
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
        {titleText}
      </summary>
      {panelBody}
    </details>
  )
}
