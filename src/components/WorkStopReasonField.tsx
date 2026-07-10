const MIN_LEN = 3

export function WorkStopReasonField(props: {
  id: string
  label: string
  hint?: string
  placeholder: string
  value: string
  disabled?: boolean
  rows?: number
  onChange: (value: string) => void
}) {
  const { id, label, hint, placeholder, value, disabled, rows = 4, onChange } = props
  const trimmed = value.trim()
  const len = trimmed.length
  const showMinHint = value.length > 0 && len < MIN_LEN

  return (
    <label className="work-stop-reason-field" htmlFor={id}>
      <div className="work-stop-reason-field__label-row">
        <span className="work-stop-reason-field__label">{label}</span>
        {hint ? <span className="work-stop-reason-field__hint">{hint}</span> : null}
      </div>
      <textarea
        id={id}
        className="work-stop-reason-field__textarea"
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <div
        className={`work-stop-reason-field__meta${showMinHint ? ' work-stop-reason-field__meta--warn' : ''}`}
      >
        <span>{showMinHint ? `Минимум ${MIN_LEN} символа` : 'Обязательное поле'}</span>
        <span>{len} симв.</span>
      </div>
    </label>
  )
}
