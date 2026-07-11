export function AddPlusButton(props: {
  onClick: () => void
  label: string
}) {
  const { onClick, label } = props
  return (
    <div className="add-plus-row">
      <button
        type="button"
        className="btn-add-plus"
        onClick={onClick}
        aria-label={label}
        title={label}
      >
        +
      </button>
    </div>
  )
}
