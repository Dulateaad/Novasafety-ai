import type { ReactNode } from 'react'
import { WORK_PERMISSION_BY_KIND } from '../config/workPermissionsConfig'
import type {
  WorkPermissionCheckboxGroup,
  WorkPermissionDocument,
  WorkPermissionForm,
} from '../types/workPermissions'

function CheckboxGroupEditor(props: {
  group: WorkPermissionCheckboxGroup
  onChange: (group: WorkPermissionCheckboxGroup) => void
  columns?: 1 | 2
}) {
  const { group, onChange, columns = 1 } = props
  return (
    <fieldset className={`work-perm-checks work-perm-checks--cols-${columns}`}>
      <legend className="work-perm-checks__legend">{group.label}</legend>
      <ul className="work-perm-checks__list">
        {group.items.map((item, idx) => (
          <li key={item.id} className="work-perm-checks__item">
            <label className="check work-perm-checks__check">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => {
                  const items = [...group.items]
                  items[idx] = { ...item, checked: e.target.checked }
                  onChange({ ...group, items })
                }}
              />
              <span>{item.label}</span>
            </label>
            <input
              className="work-perm-checks__note"
              placeholder="Уточнение"
              value={item.note}
              onChange={(e) => {
                const items = [...group.items]
                items[idx] = { ...item, note: e.target.value }
                onChange({ ...group, items })
              }}
            />
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

function FormSection(props: {
  num: string
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="work-perm-form__section">
      <header className="work-perm-form__section-head">
        <span className="work-perm-form__section-num">{props.num}</span>
        <div>
          <h3 className="work-perm-form__section-title">{props.title}</h3>
          {props.hint ? <p className="work-perm-form__section-hint">{props.hint}</p> : null}
        </div>
      </header>
      <div className="work-perm-form__section-body">{props.children}</div>
    </section>
  )
}

export function WorkPermissionFormEditor(props: {
  doc: WorkPermissionDocument
  onChange: (form: WorkPermissionForm) => void
  /** Скрыть раздел 3 — заполняется допускающим на карточке наряда. */
  hidePreWorkSection?: boolean
}) {
  const { doc, onChange, hidePreWorkSection = false } = props
  const f = doc.form
  const style = WORK_PERMISSION_BY_KIND[doc.kind].style
  const isCs = doc.kind === 'confined_space'
  const isFire = doc.kind === 'open_flame_fire'

  function patch(partial: Partial<WorkPermissionForm>) {
    onChange({ ...f, ...partial })
  }

  const workLabel = isCs ? 'Наименование работ (вход в ЗП)' : 'Наименование / объём работ'
  const equipLabel = isCs ? 'Инструменты и оборудование' : 'Инструменты и оборудование'

  return (
    <div className={`work-perm-form work-perm-form--${style}`}>
      <FormSection
        num="1"
        title="Заявка на проведение работ"
        hint="Заполняется производителем работ"
      >
        <div className="work-perm-form__meta-grid">
          <label className="work-perm-field">
            <span className="work-perm-field__label">Объект</span>
            <input
              value={f.siteObject}
              placeholder="Наименование объекта"
              onChange={(e) => patch({ siteObject: e.target.value })}
            />
          </label>
          <label className="work-perm-field">
            <span className="work-perm-field__label">№ сопутств. Н-Д</span>
            <input
              value={f.pprRef}
              placeholder="Номер наряд-допуска"
              onChange={(e) => patch({ pprRef: e.target.value })}
            />
          </label>
          {isFire ? (
            <div className="work-perm-field work-perm-field--category">
              <span className="work-perm-field__label">Категория разрешения</span>
              <div className="work-perm-form__category-row">
                <label className="check">
                  <input
                    type="radio"
                    name={`fire-cat-${doc.kind}`}
                    checked={f.fireCategory === '1'}
                    onChange={() => patch({ fireCategory: '1' })}
                  />
                  1
                </label>
                <label className="check">
                  <input
                    type="radio"
                    name={`fire-cat-${doc.kind}`}
                    checked={f.fireCategory === '2'}
                    onChange={() => patch({ fireCategory: '2' })}
                  />
                  2
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <label className="work-perm-field work-perm-field--wide">
          <span className="work-perm-field__label">
            {workLabel} <span className="work-perm-field__req">*</span>
          </span>
          <textarea
            rows={3}
            value={f.workDescription}
            placeholder={isCs ? 'Краткое наименование работ…' : 'Наименование работ без подробного описания…'}
            onChange={(e) => patch({ workDescription: e.target.value })}
          />
        </label>

        <label className="work-perm-field work-perm-field--wide">
          <span className="work-perm-field__label">{equipLabel}</span>
          <textarea
            rows={2}
            value={f.equipmentAndDocs}
            placeholder="Инструменты, оборудование, документация…"
            onChange={(e) => patch({ equipmentAndDocs: e.target.value })}
          />
        </label>
      </FormSection>

      {isCs ? (
        <>
          <FormSection num="3" title="Тип замкнутого пространства" hint="Обозначьте входы и выходы">
            {f.confinedSpaceTypes ? (
              <CheckboxGroupEditor
                group={f.confinedSpaceTypes}
                columns={2}
                onChange={(g) => patch({ confinedSpaceTypes: g })}
              />
            ) : null}
            <label className="work-perm-field work-perm-field--wide">
              <span className="work-perm-field__label">Ф.И.О. дежурного наблюдателя</span>
              <input
                value={f.confinedSpaceNotes}
                placeholder="Фамилия И.О. наблюдателя"
                onChange={(e) => patch({ confinedSpaceNotes: e.target.value })}
              />
            </label>
          </FormSection>
        </>
      ) : (
        !hidePreWorkSection ? (
        <FormSection
          num="3"
          title={isFire ? 'Проверки на рабочей площадке' : 'Проверки на рабочем месте'}
          hint="Отметьте наличие требуемых мер"
        >
          <CheckboxGroupEditor
            group={f.preWorkChecks}
            onChange={(g) => patch({ preWorkChecks: g })}
          />
        </FormSection>
        ) : null
      )}

      <FormSection num="+" title="Дополнительно" hint="Текст попадёт в PDF разрешения">
        <label className="work-perm-field work-perm-field--wide">
          <span className="work-perm-field__label">Сводный текст / доп. меры защиты</span>
          <textarea
            rows={3}
            value={f.bodyText}
            placeholder="Заполняется вручную или через ИИ…"
            onChange={(e) => patch({ bodyText: e.target.value })}
          />
        </label>
        <label className="work-perm-field work-perm-field--wide">
          <span className="work-perm-field__label">Частота повторных отборов проб (при необходимости)</span>
          <input
            value={f.additionalNotes}
            placeholder="Например: каждые 2 часа"
            onChange={(e) => patch({ additionalNotes: e.target.value })}
          />
        </label>
      </FormSection>

      <p className="work-perm-form__gas-hint muted xsmall">
        Раздел «Результаты отбора проб» заполняет ПАС (ERT) после выдачи наряда — данные
        автоматически попадают в PDF.
      </p>
    </div>
  )
}
