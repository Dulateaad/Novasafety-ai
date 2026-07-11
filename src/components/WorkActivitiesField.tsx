import { APP_NAME } from '../config/branding'
import { useLanguage } from '../context/LanguageContext'
import { fillTemplate } from '../i18n/getLocale'
import type { WorkPermissionTemplateMeta } from '../config/workPermissionsConfig'
import type { SpecialWorkActivity } from '../types/domain'
import { SPECIAL_WORK_ACTIVITY_ORDER, isSpecialWorkActivityDisabled } from '../types/domain'
import { WorkPermissionIcon } from './WorkPermissionIcon'

function orderedActivities(selected: Iterable<SpecialWorkActivity>): SpecialWorkActivity[] {
  const set = new Set(selected)
  return SPECIAL_WORK_ACTIVITY_ORDER.filter((activity) => set.has(activity))
}

export function WorkActivitiesField(props: {
  activities: SpecialWorkActivity[]
  requiredPermissions?: WorkPermissionTemplateMeta[]
  onChange: (activities: SpecialWorkActivity[]) => void
}) {
  const { activities, requiredPermissions = [], onChange } = props
  const { t } = useLanguage()
  const wa = t.workActivities
  const selected = new Set(activities)
  const gasHazardSelected = selected.has('gas_hazard')

  function toggle(activity: SpecialWorkActivity, checked: boolean) {
    if (checked && isSpecialWorkActivityDisabled(activity, activities)) return
    const next = new Set(selected)
    if (checked) {
      next.add(activity)
      if (activity === 'gas_hazard') next.delete('open_flame_fire')
    } else {
      next.delete(activity)
    }
    onChange(orderedActivities(next))
  }

  return (
    <section className="work-activities-field" aria-labelledby="work-activities-heading">
      <header className="work-activities-field__header">
        <div className="work-activities-field__heading">
          <h3 id="work-activities-heading" className="work-activities-field__title">
            {wa.title}
          </h3>
          <span
            className={`work-activities-field__count${activities.length === 0 ? ' is-empty' : ''}`}
          >
            {fillTemplate(wa.selectedCount, { count: activities.length })}
          </span>
        </div>
        {requiredPermissions.length > 0 ? (
          <div className="work-activities-field__perm-sub">
            <span className="work-activities-field__perm-sub-label">{wa.permissionsRequired}</span>
            <ul className="work-activities-field__perm-sub-list">
              {requiredPermissions.map((tpl) => (
                <li
                  key={tpl.kind}
                  className={`work-activities-field__perm-pill work-activities-field__perm-pill--${tpl.style}`}
                >
                  <WorkPermissionIcon kind={tpl.kind} size={14} />
                  <span>{tpl.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="work-activities-field__hint">
          {fillTemplate(wa.hint, { app: APP_NAME })}
        </p>
        {gasHazardSelected ? (
          <p className="work-activities-field__fire-note">{wa.gasBlocksFireNote}</p>
        ) : null}
      </header>

      <ul className="work-activities-field__list">
        {SPECIAL_WORK_ACTIVITY_ORDER.map((activity) => {
          const checked = selected.has(activity)
          const disabled = isSpecialWorkActivityDisabled(activity, activities)
          return (
            <li key={activity}>
              <label
                className={[
                  'work-activities-field__option',
                  checked ? ' is-checked' : '',
                  disabled ? ' is-disabled' : '',
                ].join('')}
                onDoubleClick={(e) => {
                  e.preventDefault()
                  if (checked && !disabled) toggle(activity, false)
                }}
              >
                <input
                  type="checkbox"
                  className="work-activities-field__checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => toggle(activity, e.target.checked)}
                />
                <span className="work-activities-field__option-body">
                  <span className="work-activities-field__label">
                    {t.specialWork[activity]}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
