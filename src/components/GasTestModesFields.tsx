import type { WorkPermissionForm } from '../types/workPermissions'

export function GasTestModesFields(props: {
  form: WorkPermissionForm
  disabled?: boolean
  onChange: (patch: Partial<WorkPermissionForm>) => void
}) {
  const { form, disabled, onChange } = props
  const continuous = form.gasTestContinuous ?? false
  const primary = continuous ? false : (form.gasTestPrimary ?? true)
  const interval = form.gasTestPrimaryInterval ?? 'каждые 2 часа'

  return (
    <fieldset className="work-perm-gas-modes" disabled={disabled}>
      <legend className="work-perm-checks__legend">Виды газотеста</legend>
      {!continuous ? (
        <>
          <label className="check work-perm-gas-modes__row">
            <input
              type="checkbox"
              checked={primary}
              onChange={(e) =>
                onChange({
                  gasTestPrimary: e.target.checked,
                  gasTestContinuous: false,
                })
              }
            />
            <span>Первичный</span>
          </label>
          {primary ? (
            <label className="work-perm-field work-perm-field--wide">
              <span className="work-perm-field__label">Периодичность первичного газотеста</span>
              <input
                value={interval}
                placeholder="каждые 2 часа"
                onChange={(e) => onChange({ gasTestPrimaryInterval: e.target.value })}
              />
            </label>
          ) : null}
        </>
      ) : null}
      <label className="check work-perm-gas-modes__row">
        <input
          type="checkbox"
          checked={continuous}
          onChange={(e) => {
            const on = e.target.checked
            onChange(
              on
                ? { gasTestContinuous: true, gasTestPrimary: false }
                : { gasTestContinuous: false },
            )
          }}
        />
        <span>Постоянный</span>
      </label>
    </fieldset>
  )
}
