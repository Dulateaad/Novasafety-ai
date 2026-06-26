import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PTW_SITE_OPTIONS } from '../config/ptwSites'
import type {
  AsorEmergencySelections,
  AsorForm,
  AsorPermitDocuments,
  AsorPpeSelections,
  AsorTaskBlock,
  AsorHazardRow,
} from '../types/asor'
import {
  ASOR_EDITION_META,
  ASOR_PENDING_FOR_PERMIT_KEY,
  ASOR_EDITOR_AUTOSAVE_KEY,
  ASOR_PROCEDURE_REFS_DISPLAY,
  ASOR_TASK_RESIDUAL_LABELS,
  MATRIX_CELL_RISK_LABELS,
  MATRIX_LIKELIHOOD_LABELS,
  MATRIX_SEVERITY_LABELS,
  deriveRiskFromMatrix,
  emptyAsorForm,
  emptyHazard,
  emptyPersonRow,
  emptyTask,
  normalizeAsorIncoming,
} from '../types/asor'

/** Галочки СИЗ/мер (стр. 1). */
const PPE_TOGGLE_FIELDS: {
  field: keyof AsorPpeSelections
  label: string
  group?: string
}[] = [
  { group: '1. Защита лица и головы', field: 'faceShield', label: 'Лицевой щиток' },
  { field: 'arboristHelmet', label: 'Каска для лесомонтажников' },
  { field: 'helmetPainting', label: 'Тип шлема: лакокрасочные работы' },
  { field: 'helmetWelding', label: 'Тип шлема: сварочные работы' },
  {
    group: '2. Глаза',
    field: 'eyeChem',
    label: 'Химзащитные очки',
  },
  { field: 'eyeCuttingGrinding', label: 'Очки для резки / шлифработ' },
  { group: '3. Слух', field: 'hearEarplugs', label: 'Беруши' },
  { field: 'hearMuffs', label: 'Наушники' },
  { group: '4. Органы дыхания', field: 'respDustMask', label: 'Пылезащитная маска' },
  { field: 'respCascade', label: 'Каскад' },
  { field: 'respSCBA', label: 'ВДА' },
  { field: 'respiratorTypeNote', label: 'Респиратор (тип — в поле справа)' },
  {
    group: '5–11. Прочее',
    field: 'fallHarnessSystem',
    label: 'Индивидуальная страховочная система от падения',
  },
  { field: 'clothingDisposable', label: 'Одежда одноразовая' },
  { field: 'clothRainSuits', label: 'Дождевики' },
  { field: 'clothChem', label: 'Химзащитный комплект одежды' },
  { field: 'clothWelding', label: 'Одежда для сварки' },
  { field: 'apronLeather', label: 'Фартук кожаный' },
  { field: 'apronChem', label: 'Фартук химзащитный' },
  { field: 'glovesCotton', label: 'Перчатки хлопок' },
  { field: 'glovesLeather', label: 'Перчатки кожа' },
  { field: 'glovesChem', label: 'Перчатки химзащитные' },
  { field: 'glovesWelding', label: 'Перчатки для сварки' },
  { field: 'glovesDielectric', label: 'Перчатки диэлектрические' },
  { field: 'feetDielectricBoots', label: 'Сапоги диэлектрические' },
  { field: 'feetRubberBoots', label: 'Резиновые сапоги' },
  { field: 'signsHearing', label: 'Знак: защита слуха' },
  { field: 'signsDroppedObjects', label: 'Знак: падающие предметы' },
  { field: 'signsRadiography', label: 'Знак: рентген' },
  { field: 'signsN2Blowdown', label: 'Знак: продувка N₂' },
  { field: 'fenceDangerArea', label: 'Ограждение: опасный участок' },
  { field: 'fenceGasWorks', label: 'Ограждение: газоопасные работы' },
  { field: 'extraRadioOther', label: 'Рация / канал' },
]

const PERMIT_LINES: {
  field: Exclude<keyof AsorPermitDocuments, 'otherDocsLine'>
  label: string
}[] = [
  { field: 'narjadPermit', label: 'Наряд-допуск' },
  { field: 'electricalInstallationPermit', label: 'Работы в электроустановках' },
  { field: 'fireWorks', label: 'Огневые работы' },
  { field: 'pidDiagram', label: 'P&ID' },
  { field: 'gasHazardWorks', label: 'Газоопасные работы' },
  {
    field: 'hazardousEnergyIsolation',
    label: 'Изоляция источников опасной энергии',
  },
  { field: 'radiographyWorks', label: 'Радиография' },
  { field: 'liftingOperationsPlan', label: 'План грузоподъёмных операций' },
  { field: 'excavationPlan', label: 'План земляных работ' },
  { field: 'confinedSpacePermit', label: 'Работы в ЗПО (замкнутый объём)' },
  { field: 'simultaneousOpsSIMOPSPlan', label: 'План ОПР / SIMOPS' },
]

export function RiskAssessmentPage() {
  const nav = useNavigate()
  const [form, setForm] = useState<AsorForm>(() => emptyAsorForm())
  const [boot, setBoot] = useState(true)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ASOR_EDITOR_AUTOSAVE_KEY)
      if (raw) {
        const m = normalizeAsorIncoming(JSON.parse(raw))
        if (m) setForm(m)
      }
    } catch {
      /* ignore */
    }
    setBoot(false)
  }, [])

  useEffect(() => {
    if (boot) return
    try {
      sessionStorage.setItem(ASOR_EDITOR_AUTOSAVE_KEY, JSON.stringify(form))
    } catch {
      /* ignore quota */
    }
  }, [form, boot])

  function patch(patch: Partial<AsorForm>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function patchPpe(patch: Partial<AsorPpeSelections>) {
    setForm((f) => ({ ...f, ppe: { ...f.ppe, ...patch } }))
  }

  function patchDocs(patch: Partial<AsorPermitDocuments>) {
    setForm((f) => ({
      ...f,
      permitDocuments: { ...f.permitDocuments, ...patch },
    }))
  }

  function patchEmergency(patch: Partial<AsorEmergencySelections>) {
    setForm((f) => ({ ...f, emergency: { ...f.emergency, ...patch } }))
  }

  function addTask() {
    setForm((f) => ({
      ...f,
      tasks: [...f.tasks, emptyTask(f.tasks.length + 1)],
    }))
  }

  function patchTask(taskId: string, patch: Partial<AsorTaskBlock>) {
    setForm((f) => ({
      ...f,
      tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }))
  }

  function addHazard(taskId: string) {
    setForm((f) => ({
      ...f,
      tasks: f.tasks.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              hazards: [...t.hazards, { ...emptyHazard(), ordinal: t.hazards.length + 1 }],
            },
      ),
    }))
  }

  function patchHazard(
    taskId: string,
    hazardId: string,
    patch: Partial<AsorHazardRow>,
  ) {
    setForm((f) => ({
      ...f,
      tasks: f.tasks.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              hazards: t.hazards.map((h) =>
                h.id !== hazardId ? h : { ...h, ...patch },
              ),
            },
      ),
    }))
  }

  function removeHazard(taskId: string, hazardId: string) {
    setForm((f) => ({
      ...f,
      tasks: f.tasks.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              hazards: t.hazards.filter((h) => h.id !== hazardId),
            },
      ),
    }))
  }

  function addTeamParticipant() {
    setForm((f) => ({
      ...f,
      declarationTeamRows: [...f.declarationTeamRows, emptyPersonRow()],
    }))
  }

  function patchTeam(idx: number, patch: Partial<(typeof form.declarationTeamRows)[0]>) {
    setForm((f) => ({
      ...f,
      declarationTeamRows: f.declarationTeamRows.map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }))
  }

  function patchShift(idx: number, patch: Partial<(typeof form.shiftTakeoverMembers)[0]>) {
    setForm((f) => ({
      ...f,
      shiftTakeoverMembers: f.shiftTakeoverMembers.map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }))
  }

  function patchApproval(
    roleKey: (typeof form.approvals)[0]['roleKey'],
    patch: Partial<(typeof form.approvals)[0]>,
  ) {
    setForm((f) => ({
      ...f,
      approvals: f.approvals.map((a) =>
        a.roleKey === roleKey ? { ...a, ...patch } : a,
      ),
    }))
  }

  function gotoNewPermit() {
    sessionStorage.setItem(ASOR_PENDING_FOR_PERMIT_KEY, JSON.stringify(form))
    nav('/new', { state: { asor: form } })
  }

  function resetDraft() {
    setForm(emptyAsorForm())
    sessionStorage.removeItem(ASOR_EDITOR_AUTOSAVE_KEY)
  }

  const matrixRisk = deriveRiskFromMatrix(form.matrixLikelihood, form.matrixSeverity)

  if (boot) {
    return (
      <div className="page narrow">
        <p className="muted">Открываю черновик…</p>
      </div>
    )
  }

  let prevGroup = ''
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Оценка риска (АСОР)</h1>
          <p className="muted small" style={{ marginTop: '-0.25rem' }}>
            {ASOR_EDITION_META.title} · {ASOR_EDITION_META.formRef} · изд.{' '}
            {ASOR_EDITION_META.edition}
          </p>
          <p className="muted xsmall">{ASOR_EDITION_META.subtitle}</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={gotoNewPermit}>
            Далее: оформить наряд-допуск
          </button>
          <button type="button" className="btn ghost" onClick={resetDraft}>
            Очистить анкету
          </button>
          <Link className="btn ghost" to="/">
            Журнал НД
          </Link>
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>
          После сохранения наряда блок АСОР прикладывается к записи автоматически; оба документа
          отправляются в один поток утверждения.
        </p>
      </section>

      <details open className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          1 раздел · заполняет рабочая команда АСОР (ПР, допускающий, выдающий НД)
        </summary>
        <div className="form" style={{ marginTop: '0.85rem', gap: '0.85rem', display: 'grid' }}>
          <div className="row">
            <label>
              Дата создания
              <input
                type="date"
                value={form.creationDateIso}
                onChange={(e) => patch({ creationDateIso: e.target.value })}
              />
            </label>
            <label>
              Продолжительность работ
              <input
                value={form.workDurationText}
                onChange={(e) => patch({ workDurationText: e.target.value })}
                placeholder="например, 7 дней"
              />
            </label>
            <label>
              НД № (предв.)
              <input
                value={form.tentativeNdReference}
                onChange={(e) => patch({ tentativeNdReference: e.target.value })}
                placeholder="будет присвоен в реестре"
              />
            </label>
          </div>
          <label>
            Кратко для поля НД (наименование)
            <input
              value={form.shortTitleForNarjad}
              onChange={(e) => patch({ shortTitleForNarjad: e.target.value })}
              placeholder="как уйдёт в карточку наряд-допуска"
            />
          </label>
          <label>
            Объём работ
            <textarea
              rows={4}
              value={form.workScopeMarkdown}
              onChange={(e) => patch({ workScopeMarkdown: e.target.value })}
            />
          </label>
          <label>
            Оборудование, на котором будут работы
            <textarea
              rows={3}
              value={form.equipmentMarkdown}
              onChange={(e) => patch({ equipmentMarkdown: e.target.value })}
            />
          </label>
          <label>
            Место проведения работ
            <textarea
              rows={2}
              value={form.workPlacesText}
              onChange={(e) => patch({ workPlacesText: e.target.value })}
              placeholder="Можно перечислить скважины; при точном совпадении имени объекта он подставится в НД"
            />
          </label>
          <label>
            Подсказка по объекту в НД (из списка)
            <select
              value=""
              onChange={(e) =>
                patch({
                  workPlacesText:
                    `${form.workPlacesText}\n${e.target.value}`.trim(),
                })
              }
            >
              <option value="">+ Добавить строкой из каталога</option>
              {PTW_SITE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Комментарий по рабочей команде (кто участвовал в АСОР)
            <textarea
              rows={2}
              value={form.teamParticipatingNote}
              onChange={(e) => patch({ teamParticipatingNote: e.target.value })}
            />
          </label>
        </div>
      </details>

      <details className="card" style={{ marginTop: '0.85rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          Специальные СИЗ и меры (отметить применимое)
        </summary>
        <p className="muted xsmall" style={{ marginTop: '0.75rem' }}>
          Ниже — помимо базового набора противоогневых костюмов, шлемов, очков, перчаток, обуви и
          т. д., указанном в инструкциях организации.
        </p>
        <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {PPE_TOGGLE_FIELDS.map((row) => {
            const gh = row.group
            const showGh = gh && gh !== prevGroup
            if (showGh && gh) prevGroup = gh
            return (
              <div key={`${row.field}`}>
                {showGh ? (
                  <div className="strong small" style={{ marginTop: '0.65rem', marginBottom: '0.35rem' }}>
                    {row.group}
                  </div>
                ) : null}
                <label className="check" style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.ppe[row.field])}
                    onChange={(e) =>
                      patchPpe({ [row.field]: e.target.checked } as Partial<AsorPpeSelections>)
                    }
                  />
                  {row.label}
                </label>
              </div>
            )
          })}
        </div>
        <div className="grid-2 form" style={{ marginTop: '1rem', gap: '0.65rem', display: 'grid' }}>
          <label className="span-2">
            Шлем прочее
            <input
              value={form.ppe.helmetOtherNote}
              onChange={(e) => patchPpe({ helmetOtherNote: e.target.value })}
            />
          </label>
          <label className="span-2">
            Лимит времени воздействия (слух и др.)
            <input
              value={form.ppe.hearTimeLimitNote}
              onChange={(e) => patchPpe({ hearTimeLimitNote: e.target.value })}
            />
          </label>
          <label className="span-2">
            Тип респиратора
            <input
              value={form.ppe.respiratorTypeText}
              onChange={(e) => patchPpe({ respiratorTypeText: e.target.value })}
            />
          </label>
          <label className="span-2">
            Перчатки — прочее
            <input
              value={form.ppe.glovesOtherNote}
              onChange={(e) => patchPpe({ glovesOtherNote: e.target.value })}
            />
          </label>
          <label className="span-2">
            Предупреждающие знаки — прочее
            <input
              value={form.ppe.signsOtherNote}
              onChange={(e) => patchPpe({ signsOtherNote: e.target.value })}
            />
          </label>
          <label className="span-2">
            Ограждение — прочее
            <input
              value={form.ppe.fenceOtherNote}
              onChange={(e) => patchPpe({ fenceOtherNote: e.target.value })}
            />
          </label>
          <label className="span-2">
            Рация / канал
            <input
              value={form.ppe.extraRadioChannelNote}
              onChange={(e) => patchPpe({ extraRadioChannelNote: e.target.value })}
            />
          </label>
          <label className="span-2">
            Дополнительные требования — прочее
            <textarea
              rows={2}
              value={form.ppe.extraRequirementsOtherNote}
              onChange={(e) =>
                patchPpe({ extraRequirementsOtherNote: e.target.value })
              }
            />
          </label>
        </div>
      </details>

      <details className="card" style={{ marginTop: '0.85rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          Инструменты, процедуры, разрешения
        </summary>
        <div className="form" style={{ marginTop: '0.85rem' }}>
          <label>
            Перечень инструментов / оборудования для работы
            <textarea
              rows={3}
              value={form.toolsEquipmentList}
              onChange={(e) => patch({ toolsEquipmentList: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.staffReadProcedureListConfirmed}
              onChange={(e) =>
                patch({ staffReadProcedureListConfirmed: e.target.checked })
              }
            />
            Персонал ознакомлен с перечисленными процедурами, необходимыми для данной работы
          </label>
          <fieldset className="fieldset">
            <legend>Перечень процедур (статический)</legend>
            <ul className="compact-list muted small">
              {ASOR_PROCEDURE_REFS_DISPLAY.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </fieldset>
          <fieldset className="fieldset">
            <legend>Разрешительные документы</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {PERMIT_LINES.map((row) => (
                <label key={row.field} className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.permitDocuments[row.field])}
                    onChange={(e) =>
                      patchDocs({ [row.field]: e.target.checked } as Partial<AsorPermitDocuments>)
                    }
                  />
                  {row.label}
                </label>
              ))}
            </div>
            <label style={{ marginTop: '0.65rem', display: 'block' }}>
              Другое
              <input
                value={form.permitDocuments.otherDocsLine}
                onChange={(e) => patchDocs({ otherDocsLine: e.target.value })}
              />
            </label>
          </fieldset>
          <fieldset className="fieldset">
            <legend>Планы аварийно-спасательных работ</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={form.emergency.confinedSpaceARSPlan}
                onChange={(e) =>
                  patchEmergency({
                    confinedSpaceARSPlan: e.target.checked,
                  })
                }
              />
              Замкнутые объёмы
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.emergency.heightRescueInfoPack}
                onChange={(e) =>
                  patchEmergency({
                    heightRescueInfoPack: e.target.checked,
                  })
                }
              />
              Работы на высоте — информационный пакет
            </label>
            <label>
              Прочее
              <input
                value={form.emergency.otherEmergencyNote}
                onChange={(e) =>
                  patchEmergency({
                    otherEmergencyNote: e.target.value,
                  })
                }
              />
            </label>
          </fieldset>
          <label>
            Другие ресурсы
            <textarea
              rows={2}
              value={form.supplementaryResourcesMarkdown}
              onChange={(e) =>
                patch({ supplementaryResourcesMarkdown: e.target.value })
              }
            />
          </label>
        </div>
      </details>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0 }}>2 раздел · задания и опасные факторы</h2>
        <p className="muted small">
          На каждый блок «Задание №…» добавьте опасные факторы, опишите средства защиты и выберите
          остаточный уровень риска.
        </p>
        <div className="btn-row" style={{ marginBottom: '0.85rem' }}>
          <button type="button" className="btn ghost" onClick={addTask}>
            + Добавить задание
          </button>
        </div>
        {form.tasks.map((task, ti) => (
          <div key={task.id} className="card" style={{ marginBottom: '0.85rem', padding: '0.85rem' }}>
            <label>
              Задание №{ti + 1}
              <input
                value={task.taskTitle}
                onChange={(e) => patchTask(task.id, { taskTitle: e.target.value })}
                placeholder="краткий заголовок задания"
              />
            </label>
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost small"
                onClick={() => addHazard(task.id)}
              >
                + Опасный фактор
              </button>
            </div>
            {task.hazards.map((haz, hi) => (
              <div
                key={haz.id}
                style={{
                  borderLeft: '3px solid var(--border-strong, #cfd6e6)',
                  paddingLeft: '0.75rem',
                  marginTop: '0.85rem',
                }}
              >
                <div className="strong small">{`Фактор № ${hi + 1}`}</div>
                <label>
                  Описание
                  <input
                    value={haz.factorDescription}
                    onChange={(e) =>
                      patchHazard(task.id, haz.id, {
                        factorDescription: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Средства защиты от фактора
                  <textarea
                    rows={3}
                    value={haz.protectiveMeasures}
                    onChange={(e) =>
                      patchHazard(task.id, haz.id, {
                        protectiveMeasures: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Остаточный риск
                  <select
                    value={haz.residualRisk}
                    onChange={(e) =>
                      patchHazard(task.id, haz.id, {
                        residualRisk: e.target.value as AsorHazardRow['residualRisk'],
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="low">{ASOR_TASK_RESIDUAL_LABELS.low}</option>
                    <option value="medium">{ASOR_TASK_RESIDUAL_LABELS.medium}</option>
                    <option value="high">{ASOR_TASK_RESIDUAL_LABELS.high}</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => removeHazard(task.id, haz.id)}
                >
                  Удалить фактор
                </button>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0 }}>Матрица вероятность × последствие</h2>
        <p className="muted small">
          Заполните параметры матрицы (стр. 5 АСОР). Уровень риска рассчитывается автоматически —
          см. текстовые подсказки на таблице.
        </p>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <label>
            Вероятность
            <select
              value={form.matrixLikelihood}
              onChange={(e) =>
                patch({
                  matrixLikelihood: e.target.value as AsorForm['matrixLikelihood'],
                })
              }
            >
              <option value="">—</option>
              <option value="likely">{MATRIX_LIKELIHOOD_LABELS.likely}</option>
              <option value="rare">{MATRIX_LIKELIHOOD_LABELS.rare}</option>
            </select>
          </label>
          <label>
            Степень последствий
            <select
              value={form.matrixSeverity}
              onChange={(e) =>
                patch({
                  matrixSeverity: e.target.value as AsorForm['matrixSeverity'],
                })
              }
            >
              <option value="">—</option>
              <option value="insignificant">
                {MATRIX_SEVERITY_LABELS.insignificant}
              </option>
              <option value="moderateHarm">{MATRIX_SEVERITY_LABELS.moderateHarm}</option>
              <option value="significantHarm">
                {MATRIX_SEVERITY_LABELS.significantHarm}
              </option>
            </select>
          </label>
          <label>
            Авторасчёт
            <input
              readOnly
              value={
                matrixRisk ? MATRIX_CELL_RISK_LABELS[matrixRisk] : '— заполните оба параметра —'
              }
            />
          </label>
        </div>
      </section>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0 }}>Утверждение (роли)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Роль</th>
                <th>ФИО</th>
                <th>Пропуск</th>
                <th>Дата</th>
                <th>Согласие</th>
              </tr>
            </thead>
            <tbody>
              {form.approvals.map((row) => (
                <tr key={row.roleKey}>
                  <td>{row.roleLabelRu}</td>
                  <td>
                    <input
                      value={row.fullNamePrinted}
                      onChange={(e) =>
                        patchApproval(row.roleKey, {
                          fullNamePrinted: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.badgeNo}
                      onChange={(e) =>
                        patchApproval(row.roleKey, { badgeNo: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.dateIso}
                      onChange={(e) =>
                        patchApproval(row.roleKey, {
                          dateIso: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.acknowledged}
                      onChange={(e) =>
                        patchApproval(row.roleKey, {
                          acknowledged: e.target.checked,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0 }}>Рабочая команда — декларация</h2>
        <blockquote className="muted small">
          «Я принял участие в АСОР, проведённом для данной работы, согласен и подтверждаю, что меры
          контроля опасных факторов достаточны.»
        </blockquote>
        <label className="check">
          <input
            type="checkbox"
            checked={form.declarationParagraphAccepted}
            onChange={(e) =>
              patch({ declarationParagraphAccepted: e.target.checked })
            }
          />
          Команда подтвердила указанную формулировку о достаточности мер
        </label>
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn ghost small" onClick={addTeamParticipant}>
            + Участник команды
          </button>
        </div>
        <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Роль</th>
                <th>ФИО</th>
                <th>Пропуск</th>
                <th>Дата</th>
                <th>Подтверждение</th>
              </tr>
            </thead>
            <tbody>
              {form.declarationTeamRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    Пока нет строк · добавляйте по мере необходимости
                  </td>
                </tr>
              )}
              {form.declarationTeamRows.map((row, idx) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.rolePrinted}
                      onChange={(e) =>
                        patchTeam(idx, { rolePrinted: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.fullNamePrinted}
                      onChange={(e) =>
                        patchTeam(idx, { fullNamePrinted: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.badgeNo}
                      onChange={(e) => patchTeam(idx, { badgeNo: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.dateIso}
                      onChange={(e) => patchTeam(idx, { dateIso: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.signatureAcknowledged}
                      onChange={(e) =>
                        patchTeam(idx, {
                          signatureAcknowledged: e.target.checked,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: '0.85rem' }}>
        <h2 style={{ marginTop: 0 }}>Пересменка ответственных лиц АСОР</h2>
        <p className="muted small">15 строк, как на бланке.</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Роль</th>
                <th>ФИО</th>
                <th>Пропуск</th>
                <th>Дата</th>
                <th>Отметка</th>
              </tr>
            </thead>
            <tbody>
              {form.shiftTakeoverMembers.slice(0, 15).map((row, idx) => (
                <tr key={row.id}>
                  <td>
                    <input
                      value={row.rolePrinted}
                      onChange={(e) =>
                        patchShift(idx, { rolePrinted: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.fullNamePrinted}
                      onChange={(e) =>
                        patchShift(idx, { fullNamePrinted: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.badgeNo}
                      onChange={(e) =>
                        patchShift(idx, { badgeNo: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={row.dateIso}
                      onChange={(e) => patchShift(idx, { dateIso: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.signatureAcknowledged}
                      onChange={(e) =>
                        patchShift(idx, {
                          signatureAcknowledged: e.target.checked,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: '0.85rem', marginBottom: '3rem' }}>
        <button type="button" className="btn primary" onClick={gotoNewPermit}>
          Завершить АСОР и перейти к оформлению НД
        </button>
      </section>
    </div>
  )
}
